import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse, requireCompanyAdmin } from "@/lib/auth";
import { nextRefNo } from "@/lib/refNo";

import Quotation from "@/models/Quotation";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const url = new URL(req.url);

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };
    const status = url.searchParams.get("status");
    const customerId = url.searchParams.get("customerId");
    const locationId = url.searchParams.get("locationId");
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (locationId) filter.locationId = locationId;

    const q = url.searchParams.get("q");
    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { customerNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      Quotation.find(filter)
        .sort({ quotationDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "locationId", select: "name" })
        .populate({ path: "createdBy", select: "name" })
        .lean(),
      Quotation.countDocuments(filter),
      Quotation.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            grandTotal: { $sum: "$grandTotal" },
          },
        },
      ]),
    ]);

    const totals = totalsAgg[0] || { grandTotal: 0 };

    return NextResponse.json({
      rows: rows.map((r: any) => ({
        ...r,
        locationName: r.locationId?.name || "",
        addedByName: r.createdBy?.name || "",
      })),
      total,
      totals,
      can: {
        admin: Boolean(session.isOwner || session.role === "ADMIN"),
        create: true,
        update: true,
        delete: Boolean(session.isOwner || session.role === "ADMIN"),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    // Staff can create quotations
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const {
      customerId,
      locationId,
      quotationDate,
      expiryDate,
      status,
      referenceNo,
      shippingCharges,
      notes,
      items,
    } = body;

    if (!customerId) return NextResponse.json({ error: "CUSTOMER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const autoRef = await nextRefNo(session.companyId, "QUOTATION", "QUO");

    const customer = await Customer.findOne({
      _id: customerId,
      companyId: session.companyId,
      contactType: { $in: ["CUSTOMER", "BOTH"] },
      status: "ACTIVE",
    })
      .select("_id name businessName")
      .lean();

    if (!customer) return NextResponse.json({ error: "INVALID_CUSTOMER" }, { status: 400 });

    // Check reference uniqueness
    const existing = await Quotation.findOne({
      companyId: session.companyId,
      referenceNo: autoRef,
      status: { $in: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] },
    }).lean();
    if (existing) return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 400 });

    // Validate items
    const validatedItems = [];
    for (const it of items) {
      if (!it.productId || typeof it.qty !== "number" || it.qty <= 0 || typeof it.unitPrice !== "number" || it.unitPrice < 0) {
        return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
      }
      const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId, isActive: true })
        .select("_id name sku sellingPrice")
        .lean();
      if (!prod) return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
      validatedItems.push({
        productId: it.productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.qty) * Number(it.unitPrice),
      });
    }

    const subtotal = validatedItems.reduce((s, it) => s + it.lineTotal, 0);
    const grandTotal = subtotal + Number(shippingCharges || 0);

    // Create quotation
    const quotation = new Quotation({
      companyId: session.companyId,
      customerId,
      customerNameSnapshot: customer.businessName || customer.name,
      locationId,
      quotationDate: new Date(quotationDate || Date.now()),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: status === "SENT" ? "SENT" : "DRAFT",
      referenceNo: autoRef,
      shippingCharges: Number(shippingCharges || 0),
      subtotal,
      grandTotal,
      notes: notes?.trim() || "",
      items: validatedItems,
      createdBy: session.userId,
    });

    await quotation.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}