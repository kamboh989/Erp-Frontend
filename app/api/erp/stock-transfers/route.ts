import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { nextRefNo } from "@/lib/refNo";
import StockTransfer from "@/models/StockTransfer";
import Product from "@/models/Product";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function nnum(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const fromLocationId = (url.searchParams.get("fromLocationId") || "").trim();
    const toLocationId = (url.searchParams.get("toLocationId") || "").trim();

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (fromLocationId) filter.fromLocationId = fromLocationId;
    if (toLocationId) filter.toLocationId = toLocationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
      ];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ transferDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "fromLocationId", select: "name" })
        .populate({ path: "toLocationId", select: "name" })
        .populate({ path: "createdBy", select: "name" })
        .lean(),
      StockTransfer.countDocuments(filter),
      StockTransfer.aggregate([
        { $match: filter },
        { $group: { _id: null, grandTotal: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const totals = totalsAgg?.[0] || { grandTotal: 0 };
    const out = (rows || []).map((r: any) => ({
      ...r,
      fromLocationName: r.fromLocationId?.name || "",
      toLocationName: r.toLocationId?.name || "",
      addedByName: r.createdBy?.name || "",
    }));

    const isAdminUser = Boolean(session.isOwner || session.role === "ADMIN");
    return NextResponse.json({
      page,
      limit,
      total,
      rows: out,
      totals,
      can: {
        admin: isAdminUser,
        update: isAdminUser,
        delete: isAdminUser,
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
    const fromLocationId = String(body?.fromLocationId || "").trim();
    const toLocationId = String(body?.toLocationId || "").trim();
    const transferDate = body?.transferDate ? new Date(body.transferDate) : new Date();
    const status = String(body?.status || "PENDING").toUpperCase();
    const autoRef = await nextRefNo(session.companyId, "STOCK_TRANSFER", "STR");
    const referenceNo = String(body?.referenceNo || "").trim() || autoRef;
    const shippingCharges = Math.max(0, nnum(body?.shippingCharges, 0));
    const notes = String(body?.notes || "").trim();
    const itemsIn = Array.isArray(body?.items) ? body.items : [];

    if (!fromLocationId) return NextResponse.json({ error: "FROM_LOCATION_REQUIRED" }, { status: 400 });
    if (!toLocationId) return NextResponse.json({ error: "TO_LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!["PENDING", "IN_TRANSIT", "COMPLETED"].includes(status))
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    if (!itemsIn.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

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
      const productId = String(x.productId || "").trim();
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

    if (items.some((it: any) => !it.productId || it.qty <= 0 || it.unitPrice < 0))
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });

    const subtotal = items.reduce((s: number, it: any) => s + it.lineTotal, 0);
    const grandTotal = subtotal + shippingCharges;

    const doc = await StockTransfer.create({
      companyId: session.companyId,
      fromLocationId,
      toLocationId,
      transferDate,
      status,
      referenceNo,
      shippingCharges,
      notes,
      subtotal,
      grandTotal,
      items,
      createdBy: session.userId,
      updatedBy: session.userId,
      finalizedAt: status === "COMPLETED" ? new Date() : null,
    });

    return NextResponse.json({ row: doc }, { status: 201 });
  } catch (err: any) {
    if (String(err?.message || "") === "INVALID_PRODUCT")
      return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
    if (err?.code === 11000)
      return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}
