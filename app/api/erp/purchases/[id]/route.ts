import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse, requireCompanyAdmin } from "@/lib/auth";

import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";
import Product from "@/models/Product";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await Purchase.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      row: {
        ...row,
        locationName: (row as any).locationId?.name || "",
      },
      can: {
        admin: Boolean(session.isOwner || session.role === "ADMIN"),
        cancel: Boolean(session.isOwner || session.role === "ADMIN"),
        delete: Boolean(session.isOwner || session.role === "ADMIN"),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** ✅ EDIT DRAFT Purchase */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const { supplierId, locationId, purchaseDate, status, referenceNo, shippingCharges, notes, items } = body;

    if (!supplierId) return NextResponse.json({ error: "SUPPLIER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo?.trim()) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const purchase = await Purchase.findOne({ _id: id, companyId: session.companyId });
    if (!purchase) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((purchase as any).status !== "DRAFT") return NextResponse.json({ error: "CANNOT_EDIT_NON_DRAFT" }, { status: 400 });

    const oldStatus = (purchase as any).status; // Store old status

    const supplier = await Supplier.findOne({ _id: supplierId, companyId: session.companyId, contactType: "SUPPLIER" }).select("_id name businessName").lean();
    if (!supplier) return NextResponse.json({ error: "INVALID_SUPPLIER" }, { status: 400 });

    const existing = await Purchase.findOne({ _id: { $ne: id }, companyId: session.companyId, referenceNo: referenceNo.trim(), status: { $in: ["DRAFT", "FINAL"] } }).lean();
    if (existing) return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });

    const validatedItems = [];
    for (const it of items) {
      if (!it.productId || typeof it.qty !== "number" || it.qty <= 0 || typeof it.unitCost !== "number" || it.unitCost < 0)
        return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
      const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId, isActive: true }).select("_id name sku").lean();
      if (!prod) return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
      validatedItems.push({ productId: it.productId, nameSnapshot: prod.name, skuSnapshot: prod.sku, qty: Number(it.qty), unitCost: Number(it.unitCost), lineTotal: Number(it.qty) * Number(it.unitCost) });
    }

    const subtotal = validatedItems.reduce((s, it) => s + it.lineTotal, 0);
    const grandTotal = subtotal + Math.max(0, Number(shippingCharges || 0));

    (purchase as any).supplierId = supplierId;
    (purchase as any).supplierNameSnapshot = (supplier as any).businessName || (supplier as any).name || "Supplier";
    (purchase as any).locationId = locationId;
    (purchase as any).purchaseDate = new Date(purchaseDate || Date.now());
    const newStatus = status === "FINAL" ? "FINAL" : "DRAFT";
    (purchase as any).status = newStatus;
    (purchase as any).referenceNo = referenceNo.trim();
    (purchase as any).items = validatedItems;
    (purchase as any).subtotal = subtotal;
    (purchase as any).shippingCharges = Math.max(0, Number(shippingCharges || 0));
    (purchase as any).grandTotal = grandTotal;
    (purchase as any).notes = notes?.trim() || "";
    (purchase as any).updatedBy = session.userId;
    if (newStatus === "FINAL") {
      (purchase as any).finalizedAt = new Date();
    }

    await purchase.save();

    // ── If DRAFT → FINAL: post stock + supplier due ──
    if (oldStatus === "DRAFT" && newStatus === "FINAL") {
      for (const it of validatedItems) {
        const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId })
          .select("_id manageStock")
          .lean();
        if (!prod?.manageStock) continue;
        await Product.updateOne(
          { _id: new mongoose.Types.ObjectId(String(it.productId)), companyId: new mongoose.Types.ObjectId(session.companyId) },
          { $inc: { currentStock: Number(it.qty || 0) } }
        );
      }
      await Supplier.updateOne(
        { _id: supplierId, companyId: session.companyId, contactType: "SUPPLIER" },
        { $inc: { "totals.totalPurchaseDue": grandTotal } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}

/** ✅ CANCEL Purchase (FINAL -> CANCELLED) with reversal */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session); // ✅ owner/admin only
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").toUpperCase();
    if (action !== "CANCEL") return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });

    const p = await Purchase.findOne({ _id: id, companyId: session.companyId });
    if (!p) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if ((p as any).status === "CANCELLED") {
      return NextResponse.json({ error: "ALREADY_CANCELLED" }, { status: 400 });
    }
    if ((p as any).status !== "FINAL") {
      return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });
    }

    // Reverse stock + supplier due (only for manageStock products)
    const items = (p as any).items || [];
    for (const it of items) {
      const prod = await Product.findOne({
        _id: it.productId,
        companyId: session.companyId,
      }).select("_id manageStock").lean();

      if (!prod?.manageStock) continue;

      await Product.updateOne(
        { _id: new mongoose.Types.ObjectId(String(it.productId)), companyId: new mongoose.Types.ObjectId(session.companyId) },
        { $inc: { currentStock: -Number(it.qty || 0) } }
      );
    }

    await Supplier.updateOne(
      { _id: (p as any).supplierId, companyId: session.companyId, contactType: "SUPPLIER" },
      { $inc: { "totals.totalPurchaseDue": -Number((p as any).grandTotal || 0) } }
    );

    (p as any).status = "CANCELLED";
    (p as any).updatedBy = session.userId;
    await p.save();

    const updated = await Purchase.findById((p as any)._id)
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    return NextResponse.json({ row: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** ✅ DELETE draft purchase (DRAFT only) */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session); // ✅ owner/admin only
    await connectDB();
    const { id } = await ctx.params;

    const p = await Purchase.findOne({ _id: id, companyId: session.companyId }).select("_id status").lean();
    if (!p) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if ((p as any).status !== "DRAFT") {
      return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });
    }

    const result = await Purchase.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}