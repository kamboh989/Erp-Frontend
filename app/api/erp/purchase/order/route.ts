import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { isCompanyAdmin } from "@/lib/perm";

import PurchaseOrder from "@/models/PurchaseOrder";
import Supplier from "@/models/Supplier";
import Product from "@/models/Product";
import Location from "@/models/Location";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    // ✅ NEW: supplier filter (for Supplier detail → Orders tab)
    const supplierId = (url.searchParams.get("supplierId") || "").trim();

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (locationId) filter.locationId = locationId;

    // ✅ NEW
    if (supplierId) filter.supplierId = supplierId;

    if (q) {
      filter.$or = [{ referenceNo: new RegExp(q, "i") }, { supplierNameSnapshot: new RegExp(q, "i") }];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PurchaseOrder.countDocuments(filter),
      PurchaseOrder.aggregate([{ $match: filter }, { $group: { _id: null, subtotal: { $sum: "$subtotal" } } }]),
    ]);

    return NextResponse.json({
      rows,
      total,
      totals: { subtotal: totalsAgg?.[0]?.subtotal || 0 },
      can: {
        admin: isCompanyAdmin(session),
        cancel: isCompanyAdmin(session), // owner/admin only
        delete: isCompanyAdmin(session), // owner/admin only
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

    const supplierId = String(body?.supplierId || "").trim();
    const locationId = String(body?.locationId || "").trim();
    const referenceNo = String(body?.referenceNo || "").trim();
    const status = String(body?.status || "DRAFT").toUpperCase();
    const orderDate = body?.orderDate ? new Date(body.orderDate) : new Date();

    if (!supplierId) return NextResponse.json({ error: "SUPPLIER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!["DRAFT", "FINAL"].includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });

    const itemsIn = Array.isArray(body?.items) ? body.items : [];
    if (!itemsIn.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const [sup, loc] = await Promise.all([
      Supplier.findOne({ _id: supplierId, companyId: session.companyId, contactType: "SUPPLIER" }).lean(),
      Location.findOne({ _id: locationId, companyId: session.companyId, isActive: true }).lean(),
    ]);

    if (!sup) return NextResponse.json({ error: "INVALID_SUPPLIER" }, { status: 400 });
    if (!loc) return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });

    const prodIds = itemsIn.map((x: any) => String(x.productId || "")).filter(Boolean);
    const prods = await Product.find({ _id: { $in: prodIds }, companyId: session.companyId, isActive: true }).lean();
    const pMap = new Map(prods.map((p: any) => [String(p._id), p]));
    if (prods.length !== prodIds.length) return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });

    const items = itemsIn.map((x: any) => {
      const pid = String(x.productId);
      const p = pMap.get(pid);
      const qty = Math.max(0, n(x.qty));
      const unitCost = Math.max(0, n(x.unitCost));
      return {
        productId: pid,
        qty,
        unitCost,
        lineTotal: qty * unitCost,
        nameSnapshot: String(p?.name || ""),
        skuSnapshot: String(p?.sku || ""),
      };
    });

    if (items.some((it: any) => it.qty <= 0 || it.unitCost < 0)) {
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, it: any) => s + n(it.lineTotal), 0);

    const doc = await PurchaseOrder.create({
      companyId: session.companyId,
      supplierId,
      supplierNameSnapshot: String((sup as any).businessName || (sup as any).name || ""),
      locationId,
      locationName: String((loc as any).name || ""),
      orderDate,
      status,
      referenceNo,
      items,
      subtotal,
      notes: String(body?.notes || "").trim(),
      createdBy: session.userId,
      updatedBy: session.userId,
    });

    return NextResponse.json({ row: doc }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}