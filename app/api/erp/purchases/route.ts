import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse, requireCompanyAdmin } from "@/lib/auth";

import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";
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

/** ✅ LIST Purchases */
export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim(); // DRAFT/FINAL/CANCELLED
    const supplierId = (url.searchParams.get("supplierId") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    const dateFrom = (url.searchParams.get("dateFrom") || "").trim();
    const dateTo = (url.searchParams.get("dateTo") || "").trim();

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };

    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    if (locationId) filter.locationId = locationId;

    if (dateFrom || dateTo) {
      filter.purchaseDate = {};
      if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
      if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
    }

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { supplierNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      Purchase.find(filter)
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "locationId", select: "name" })
        .populate({ path: "createdBy", select: "name email role" })
        .lean(),
      Purchase.countDocuments(filter),
      Purchase.aggregate([
        { $match: filter },
        { $group: { _id: null, grandTotal: { $sum: "$grandTotal" } } },
      ]),
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
        delete: isAdmin(session), // draft delete
        cancel: isAdmin(session), // final cancel
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** ✅ CREATE Purchase (same as your minimal logic) */
export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const supplierId = String(body?.supplierId || "").trim();
    const locationId = String(body?.locationId || "").trim();
    const purchaseDate = body?.purchaseDate ? new Date(body.purchaseDate) : new Date();
    const status = String(body?.status || "DRAFT").toUpperCase();
    const referenceNo = String(body?.referenceNo || "").trim();

    const shippingCharges = Math.max(0, nnum(body?.shippingCharges, 0));
    const notes = String(body?.notes || "").trim();
    const attachmentUrl = String(body?.attachmentUrl || "").trim();

    const itemsIn = Array.isArray(body?.items) ? body.items : [];

    if (!supplierId) return NextResponse.json({ error: "SUPPLIER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!["DRAFT", "FINAL"].includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    if (!itemsIn.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const supplier = await Supplier.findOne({
      _id: supplierId,
      companyId: session.companyId,
      contactType: "SUPPLIER",
    })
      .select("_id name businessName")
      .lean();

    if (!supplier) return NextResponse.json({ error: "INVALID_SUPPLIER" }, { status: 400 });

    const productIds = itemsIn.map((x: any) => String(x.productId || "")).filter(Boolean);

    const products = await Product.find({
      companyId: session.companyId,
      isActive: true,
      _id: { $in: productIds },
    })
      .select("_id name sku manageStock")
      .lean();

    const pMap = new Map(products.map((p: any) => [String(p._id), p]));

    const items = itemsIn.map((x: any) => {
      const productId = String(x.productId || "");
      const qty = Math.max(0, nnum(x.qty));
      const unitCost = Math.max(0, nnum(x.unitCost));

      const prod = pMap.get(productId);
      if (!prod) throw new Error("INVALID_PRODUCT");

      const lineTotal = qty * unitCost;

      return {
        productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty,
        unitCost,
        lineTotal,
      };
    });

    if (items.some((i: any) => !i.productId || i.qty <= 0 || i.unitCost < 0)) {
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal) || 0), 0);
    const grandTotal = subtotal + shippingCharges;

    const purchase = await Purchase.create({
      companyId: session.companyId,
      supplierId,
      supplierNameSnapshot: supplier.businessName || supplier.name || "Supplier",
      locationId,
      purchaseDate,
      status,
      referenceNo,
      notes,
      attachmentUrl,
      shippingCharges,
      subtotal,
      grandTotal,
      items,
      createdBy: session.userId,
      updatedBy: session.userId,
      finalizedAt: status === "FINAL" ? new Date() : null,
    });

    // Posting only if FINAL
    if (status === "FINAL") {
      for (const it of items) {
        const prod = pMap.get(String(it.productId));
        if (!prod?.manageStock) continue;

        await Product.updateOne(
          { _id: it.productId, companyId: session.companyId, isActive: true },
          { $inc: { currentStock: it.qty } }
        );
      }

      await Supplier.updateOne(
        { _id: supplierId, companyId: session.companyId, contactType: "SUPPLIER" },
        { $inc: { "totals.totalPurchaseDue": grandTotal } }
      );
    }

    return NextResponse.json({ row: purchase }, { status: 201 });
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