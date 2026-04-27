import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse, requireCompanyAdmin } from "@/lib/auth";
import { nextRefNo } from "@/lib/refNo";

import PurchaseReturn from "@/models/PurchaseReturn";
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

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const supplierId = (url.searchParams.get("supplierId") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    const page = Math.max(1, toNumber(url.searchParams.get("page"), 1));
    const limit = Math.min(100, Math.max(10, toNumber(url.searchParams.get("limit"), 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    if (locationId) filter.locationId = locationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { supplierNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const [rows, total, totalsAgg] = await Promise.all([
      PurchaseReturn.find(filter)
        .sort({ returnDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "locationId", select: "name" })
        .populate({ path: "createdBy", select: "name email role" })
        .lean(),
      PurchaseReturn.countDocuments(filter),
      PurchaseReturn.aggregate([{ $match: filter }, { $group: { _id: null, grandTotal: { $sum: "$grandTotal" } } }]),
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

    const supplierId = String(body?.supplierId || "").trim();
    const locationId = String(body?.locationId || "").trim();
    const returnDate = body?.returnDate ? new Date(body.returnDate) : new Date();
    const status = String(body?.status || "DRAFT").toUpperCase();
    const autoRef = await nextRefNo(session.companyId, "PURCHASE_RETURN", "PRET");
    const referenceNo = String(body?.referenceNo || "").trim() || autoRef;

    const shippingCharges = Math.max(0, nnum(body?.shippingCharges, 0));
    const notes = String(body?.notes || "").trim();
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
    }).select("_id name businessName").lean();

    if (!supplier) return NextResponse.json({ error: "INVALID_SUPPLIER" }, { status: 400 });

    const productIds = itemsIn.map((x: any) => String(x.productId || "")).filter(Boolean);
    const products = await Product.find({
      companyId: session.companyId,
      isActive: true,
      _id: { $in: productIds },
    }).select("_id name sku manageStock currentStock").lean();

    const pMap = new Map(products.map((p: any) => [String(p._id), p]));

    const items = itemsIn.map((x: any) => {
      const productId = String(x.productId || "");
      const qty = Math.max(0, nnum(x.qty));
      const unitCost = Math.max(0, nnum(x.unitCost));
      const prod = pMap.get(productId);
      if (!prod) throw new Error("INVALID_PRODUCT");

      return {
        productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty,
        unitCost,
        lineTotal: qty * unitCost,
      };
    });

    if (items.some((i: any) => !i.productId || i.qty <= 0 || i.unitCost < 0)) {
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal) || 0), 0);
    const grandTotal = subtotal + shippingCharges;

    // ✅ stock check only for FINAL
    if (status === "FINAL") {
      for (const it of items) {
        const prod = pMap.get(String(it.productId));
        if (!prod?.manageStock) continue;

        const cs = Number(prod.currentStock || 0);
        if (cs < Number(it.qty || 0)) {
          return NextResponse.json({ error: "INSUFFICIENT_STOCK" }, { status: 400 });
        }
      }
    }

    const doc = await PurchaseReturn.create({
      companyId: session.companyId,
      supplierId,
      supplierNameSnapshot: supplier.businessName || supplier.name || "Supplier",
      locationId,
      returnDate,
      status,
      referenceNo,
      shippingCharges,
      subtotal,
      grandTotal,
      notes,
      items,
      createdBy: session.userId,
      updatedBy: session.userId,
      finalizedAt: status === "FINAL" ? new Date() : null,
    });

    if (status === "FINAL") {
      // stock decrease
      for (const it of items) {
        const prod = pMap.get(String(it.productId));
        if (!prod?.manageStock) continue;

        await Product.updateOne(
          { _id: it.productId, companyId: session.companyId },
          { $inc: { currentStock: -Number(it.qty || 0) } }
        );
      }

      // supplier return due increase
      await Supplier.updateOne(
        { _id: supplierId, companyId: session.companyId, contactType: "SUPPLIER" },
        { $inc: { "totals.totalPurchaseReturnDue": grandTotal } }
      );
    }

    return NextResponse.json({ row: doc }, { status: 201 });
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