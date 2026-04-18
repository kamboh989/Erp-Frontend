import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Sale from "@/models/Sale";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await Sale.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "customerId", select: "name businessName mobile moreInfo" })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      row: { ...row, locationName: (row as any).locationId?.name || "" },
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").toUpperCase();
    if (action === "CANCEL") {
      const sale = await Sale.findOne({ _id: id, companyId: session.companyId });
      if (!sale) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      if ((sale as any).status === "CANCELLED") return NextResponse.json({ error: "ALREADY_CANCELLED" }, { status: 400 });
      if ((sale as any).status !== "FINAL") return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });

      const items = (sale as any).items || [];
      for (const it of items) {
        const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId, isActive: true })
          .select("_id manageStock")
          .lean();
        if (!prod?.manageStock) continue;
        await Product.updateOne(
          { _id: it.productId, companyId: session.companyId, isActive: true },
          { $inc: { currentStock: Number(it.qty || 0) } }
        );
      }

      await Customer.updateOne(
        { _id: (sale as any).customerId, companyId: session.companyId, contactType: "CUSTOMER" },
        { $inc: { "totals.totalSaleDue": -Number((sale as any).dueAmount || 0) } }
      );

      (sale as any).status = "CANCELLED";
      (sale as any).updatedBy = session.userId;
      await sale.save();

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const {
      customerId,
      locationId,
      saleDate,
      status,
      referenceNo,
      shippingCharges,
      paymentAmount,
      paymentMethod,
      paymentReference,
      paymentNote,
      notes,
      items,
    } = body;

    if (!customerId) return NextResponse.json({ error: "CUSTOMER_REQUIRED" }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo?.trim()) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const customer = await Customer.findOne({ _id: customerId, companyId: session.companyId, contactType: { $in: ["CUSTOMER", "BOTH"] } }).lean();
    if (!customer) return NextResponse.json({ error: "INVALID_CUSTOMER" }, { status: 400 });

    const sale = await Sale.findOne({ _id: id, companyId: session.companyId });
    if (!sale) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((sale as any).status === "CANCELLED") return NextResponse.json({ error: "CANNOT_EDIT_CANCELLED" }, { status: 400 });
    if ((sale as any).status === "FINAL") return NextResponse.json({ error: "CANNOT_EDIT_FINAL" }, { status: 400 });

    // Check reference uniqueness
    const existing = await Sale.findOne({
      _id: { $ne: id },
      companyId: session.companyId,
      referenceNo: referenceNo.trim(),
      status: { $in: ["DRAFT", "FINAL"] },
    }).lean();
    if (existing) return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 400 });

    // Validate items
    const validatedItems = [];
    for (const it of items) {
      if (!it.productId || typeof it.qty !== "number" || it.qty <= 0 || typeof it.unitPrice !== "number" || it.unitPrice < 0) {
        return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
      }
      const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId, isActive: true })
        .select("_id name sku sellingPrice manageStock currentStock")
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
    const paidAmount = Number(paymentAmount || 0);
    const dueAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = paidAmount >= grandTotal ? "PAID" : dueAmount > 0 ? "PARTIAL" : "UNPAID";

    // Update sale
    (sale as any).customerId = customerId;
    (sale as any).locationId = locationId;
    (sale as any).saleDate = new Date(saleDate || Date.now());
    (sale as any).status = status === "FINAL" ? "FINAL" : "DRAFT";
    (sale as any).referenceNo = referenceNo.trim();
    (sale as any).items = validatedItems;
    (sale as any).subtotal = subtotal;
    (sale as any).shippingCharges = Number(shippingCharges || 0);
    (sale as any).grandTotal = grandTotal;
    (sale as any).paidAmount = paidAmount;
    (sale as any).dueAmount = dueAmount;
    (sale as any).paymentStatus = paymentStatus;
    (sale as any).paymentMethod = paymentMethod?.trim() || "";
    (sale as any).paymentReference = paymentReference?.trim() || "";
    (sale as any).paymentNote = paymentNote?.trim() || "";
    (sale as any).notes = notes?.trim() || "";
    (sale as any).updatedBy = session.userId;

    await sale.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const sale = await Sale.findOne({ _id: id, companyId: session.companyId }).select("_id status").lean();
    if (!sale) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((sale as any).status !== "DRAFT") return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    const result = await Sale.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
