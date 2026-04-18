import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function nnum(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}
function isAdmin(session: any) {
  return Boolean(session?.isOwner || session?.role === "ADMIN");
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const customerId = (url.searchParams.get("customerId") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (locationId) filter.locationId = locationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { customerNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      Quote.find(filter)
        .sort({ quoteDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "locationId", select: "name" })
        .populate({ path: "createdBy", select: "name email role" })
        .lean(),
      Quote.countDocuments(filter),
      Quote.aggregate([{ $match: filter }, { $group: { _id: null, grandTotal: { $sum: "$grandTotal" } } }]),
    ]);

    const totals = totalsAgg?.[0] || { grandTotal: 0 };
    const out = (rows || []).map((r: any) => ({
      ...r,
      locationName: r.locationId?.name || "",
      addedByName: r.createdBy?.name || r.createdBy?.email || "",
    }));

    return NextResponse.json({
      page,
      limit,
      total,
      rows: out,
      totals,
      can: {
        admin: isAdmin(session),
        delete: isAdmin(session),
        cancel: isAdmin(session),
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

    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const locationId = String(body?.locationId || "").trim();
    const quoteDate = body?.quoteDate ? new Date(body.quoteDate) : new Date();
    const status = String(body?.status || "DRAFT").toUpperCase();
    const referenceNo = String(body?.referenceNo || "").trim();
    const shippingCharges = Math.max(0, nnum(body?.shippingCharges, 0));
    const notes = String(body?.notes || "").trim();
    const itemsIn = Array.isArray(body?.items) ? body.items : [];

    if (!customerId) return NextResponse.json({ error: "CUSTOMER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!["DRAFT", "FINAL"].includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    if (!itemsIn.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const customer = await Customer.findOne({
      _id: customerId,
      companyId: session.companyId,
      contactType: "CUSTOMER",
    })
      .select("_id name businessName")
      .lean();

    if (!customer) return NextResponse.json({ error: "INVALID_CUSTOMER" }, { status: 400 });

    const productIds = itemsIn.map((x: any) => String(x.productId || "")).filter(Boolean);
    const products = await Product.find({
      companyId: session.companyId,
      isActive: true,
      _id: { $in: productIds },
    })
      .select("_id name sku")
      .lean();

    const pMap = new Map(products.map((p: any) => [String(p._id), p]));
    const items = itemsIn.map((x: any) => {
      const productId = String(x.productId || "");
      const qty = Math.max(0, nnum(x.qty));
      const unitPrice = Math.max(0, nnum(x.unitPrice));
      const prod = pMap.get(productId);
      if (!prod) throw new Error("INVALID_PRODUCT");

      return {
        productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });

    if (items.some((i: any) => !i.productId || i.qty <= 0 || i.unitPrice < 0)) {
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal) || 0), 0);
    const grandTotal = subtotal + shippingCharges;

    const quote = await Quote.create({
      companyId: session.companyId,
      customerId,
      customerNameSnapshot: customer.businessName || customer.name || "Customer",
      locationId,
      quoteDate,
      status,
      referenceNo,
      notes,
      shippingCharges,
      subtotal,
      grandTotal,
      items,
      createdBy: session.userId,
      updatedBy: session.userId,
      finalizedAt: status === "FINAL" ? new Date() : null,
    });

    return NextResponse.json({ row: quote }, { status: 201 });
  } catch (err: any) {
    if (String(err?.message || "") === "INVALID_PRODUCT") {
      return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
    }
    if (err?.code === 11000) {
      return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}
