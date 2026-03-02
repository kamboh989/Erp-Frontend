import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { listScopeFilter, isCompanyAdmin } from "@/lib/perm";
import { nextContactId } from "@/lib/idGenSupplier";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeSort(sortBy: string) {
  const allowed = new Set(["createdAt", "updatedAt", "contactId", "name", "businessName", "mobile", "status"]);
  return allowed.has(sortBy) ? sortBy : "createdAt";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));

    const sortBy = safeSort(url.searchParams.get("sortBy") || "createdAt");
    const sortDir = url.searchParams.get("sortDir") === "asc" ? 1 : -1;

    // filters
    const status = url.searchParams.get("status"); // ACTIVE/INACTIVE
    const assignedTo = url.searchParams.get("assignedTo"); // userId

    const purchaseDue = url.searchParams.get("purchaseDue") === "1";
    const purchaseReturn = url.searchParams.get("purchaseReturn") === "1";
    const advanceBalance = url.searchParams.get("advanceBalance") === "1";
    const openingBalance = url.searchParams.get("openingBalance") === "1";

    const base: any = {
      companyId: session.companyId,
      ...listScopeFilter(session),
      contactType: "SUPPLIER",
    };

    // staff can only see assigned
    if (!isCompanyAdmin(session)) {
      base.assignedTo = { $in: [session.userId] };
    }

    if (status) base.status = status;

    // assignedTo filter only for admin
    if (assignedTo) {
      if (isCompanyAdmin(session)) base.assignedTo = { $in: [assignedTo] };
      else base.assignedTo = { $in: [session.userId] };
    }

    // due filters
    if (purchaseDue) base["totals.totalPurchaseDue"] = { $gt: 0 };
    if (purchaseReturn) base["totals.totalPurchaseReturnDue"] = { $gt: 0 };
    if (advanceBalance) base["totals.advanceBalance"] = { $gt: 0 };
    if (openingBalance) base["totals.openingBalanceDue"] = { $gt: 0 };

    const search: any = q
      ? {
          $or: [
            { contactId: new RegExp(q, "i") },
            { name: new RegExp(q, "i") },
            { businessName: new RegExp(q, "i") },
            { email: new RegExp(q, "i") },
            { mobile: new RegExp(q, "i") },
            { "moreInfo.taxNumber": new RegExp(q, "i") },
            { "moreInfo.payTerm": new RegExp(q, "i") },
          ],
        }
      : {};

    const filter = { ...base, ...search };
    const skip = (page - 1) * limit;

    const [rows, total, totalsAgg] = await Promise.all([
      Supplier.find(filter).sort({ [sortBy]: sortDir }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
      Supplier.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPurchaseDue: { $sum: "$totals.totalPurchaseDue" },
            totalPurchaseReturnDue: { $sum: "$totals.totalPurchaseReturnDue" },
            openingBalanceDue: { $sum: "$totals.openingBalanceDue" },
            advanceBalance: { $sum: "$totals.advanceBalance" },
          },
        },
      ]),
    ]);

    const totals =
      totalsAgg?.[0] || {
        totalPurchaseDue: 0,
        totalPurchaseReturnDue: 0,
        openingBalanceDue: 0,
        advanceBalance: 0,
      };

    return NextResponse.json({
      page,
      limit,
      total,
      rows,
      totals,
      can: {
        delete: isCompanyAdmin(session),
        admin: isCompanyAdmin(session),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const body = await req.json();

    const partyType = String(body.partyType);
    const mobile = String(body.mobile || "").trim();
    const emailClean = String(body.email || "").trim().toLowerCase();

    if (!["INDIVIDUAL", "BUSINESS"].includes(partyType)) {
      return NextResponse.json({ error: "INVALID_PARTY_TYPE" }, { status: 400 });
    }
    if (!mobile) {
      return NextResponse.json({ error: "MOBILE_REQUIRED" }, { status: 400 });
    }

    // duplicate block
    const mobileExists = await Supplier.findOne({
      companyId: session.companyId,
      contactType: "SUPPLIER",
      mobile,
    })
      .select("_id")
      .lean();

    if (mobileExists) return NextResponse.json({ error: "MOBILE_ALREADY_EXISTS" }, { status: 409 });

    if (emailClean) {
      const emailExists = await Supplier.findOne({
        companyId: session.companyId,
        contactType: "SUPPLIER",
        email: emailClean,
      })
        .select("_id")
        .lean();

      if (emailExists) return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    const contactId = await nextContactId(String(session.companyId), "CONTACT_SUPPLIER");

    // RBAC assignedTo
    let assigned: string[] = [];
    if (isCompanyAdmin(session)) assigned = Array.isArray(body.assignedTo) ? body.assignedTo : [];
    else assigned = [session.userId];

    const moreInfo = body.moreInfo || {};
    const openingBal = Number(moreInfo.openingBalance ?? 0) || 0;

    const doc = await Supplier.create({
      companyId: session.companyId,
      contactId,
      contactType: "SUPPLIER",
      partyType,

      businessName: String(body.businessName || "").trim(),
      name: String(body.name || "").trim(),
      email: emailClean,
      mobile,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,

      assignedTo: assigned,
      status: "ACTIVE",

      moreInfo: {
        taxNumber: String(moreInfo.taxNumber || "").trim(),
        payTerm: String(moreInfo.payTerm || "").trim(),
        payTermPeriod: String(moreInfo.payTermPeriod || "").trim(),
        openingBalance: openingBal,
        billingAddress: moreInfo.billingAddress || {},
        shippingAddress: moreInfo.shippingAddress || {},
        ...moreInfo,
      },

      totals: {
        openingBalanceDue: openingBal,
        advanceBalance: 0,
        totalPurchaseDue: 0,
        totalPurchaseReturnDue: 0,
        ...(body.totals || {}),
      },

      contactPersons: Array.isArray(body.contactPersons) ? body.contactPersons.slice(0, 3) : [],
      createdBy: session.userId,
      updatedBy: session.userId,
    });

    return NextResponse.json({ contact: doc }, { status: 201 });
  } catch (err: any) {
    console.error("SUPPLIER POST ERROR:", err?.message, err);

    if (err?.code === 11000) {
      return NextResponse.json({ error: "DUPLICATE_SUPPLIER" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}