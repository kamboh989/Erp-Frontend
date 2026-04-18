import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import SaleReturn from "@/models/SaleReturn";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

function nnum(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

// ─────────────────────────────────────────────
// GET /api/erp/sale-returns/:id
// ─────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await SaleReturn.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "customerId", select: "name businessName mobile moreInfo" })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      row: { ...row, locationName: (row as any).locationId?.name || "" },
      can: {
        admin:  Boolean(session.isOwner || session.role === "ADMIN"),
        cancel: Boolean(session.isOwner || session.role === "ADMIN"),
        delete: Boolean(session.isOwner || session.role === "ADMIN"),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// ─────────────────────────────────────────────
// PUT /api/erp/sale-returns/:id  (edit DRAFT only)
// ─────────────────────────────────────────────
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
      returnDate,
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

    // ── validations ──
    if (!customerId)
      return NextResponse.json({ error: "CUSTOMER_REQUIRED" }, { status: 400 });
    if (!locationId)
      return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    if (!referenceNo?.trim())
      return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!Array.isArray(items) || !items.length)
      return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    // ── customer ──
    const customer = await Customer.findOne({
      _id: customerId,
      companyId: session.companyId,
      contactType: { $in: ["CUSTOMER", "BOTH"] },
      status: "ACTIVE",
    })
      .select("_id name businessName")
      .lean();
    if (!customer)
      return NextResponse.json({ error: "INVALID_CUSTOMER" }, { status: 400 });

    // ── existing doc ──
    const doc = await SaleReturn.findOne({ _id: id, companyId: session.companyId });
    if (!doc)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((doc as any).status === "CANCELLED")
      return NextResponse.json({ error: "CANNOT_EDIT_CANCELLED" }, { status: 400 });
    if ((doc as any).status === "FINAL")
      return NextResponse.json({ error: "CANNOT_EDIT_FINAL" }, { status: 400 });

    // ── reference uniqueness ──
    const existing = await SaleReturn.findOne({
      _id: { $ne: id },
      companyId: session.companyId,
      referenceNo: referenceNo.trim(),
      status: { $in: ["DRAFT", "FINAL"] },
    }).lean();
    if (existing)
      return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });

    // ── validate items ──
    const validatedItems = [];
    for (const it of items) {
      if (
        !it.productId ||
        typeof it.qty !== "number" ||
        it.qty <= 0 ||
        typeof it.unitPrice !== "number" ||
        it.unitPrice < 0
      ) {
        return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });
      }
      const prod = await Product.findOne({
        _id: it.productId,
        companyId: session.companyId,
        isActive: true,
      })
        .select("_id name sku manageStock currentStock")
        .lean();
      if (!prod)
        return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });

      validatedItems.push({
        productId: it.productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.qty) * Number(it.unitPrice),
      });
    }

    // ── totals ──
    const subtotal = validatedItems.reduce((s, it) => s + it.lineTotal, 0);
    const grandTotal = subtotal + Math.max(0, nnum(shippingCharges));
    const paidAmt = Math.max(0, nnum(paymentAmount));
    const dueAmt = Math.max(0, grandTotal - paidAmt);
    const paymentStatus = dueAmt === 0 ? "PAID" : paidAmt > 0 ? "PARTIAL" : "UNPAID";

    // ── update doc ──
    (doc as any).customerId            = customerId;
    (doc as any).customerNameSnapshot  = customer.businessName || customer.name || "Customer";
    (doc as any).locationId            = locationId;
    (doc as any).returnDate            = new Date(returnDate || Date.now());
    (doc as any).status                = ["DRAFT", "FINAL"].includes(status) ? status : "DRAFT";
    (doc as any).referenceNo           = referenceNo.trim();
    (doc as any).items                 = validatedItems;
    (doc as any).subtotal              = subtotal;
    (doc as any).shippingCharges       = Math.max(0, nnum(shippingCharges));
    (doc as any).grandTotal            = grandTotal;
    (doc as any).paidAmount            = paidAmt;
    (doc as any).dueAmount             = dueAmt;
    (doc as any).paymentStatus         = paymentStatus;
    (doc as any).paymentMethod         = paymentMethod?.trim() || "";
    (doc as any).paymentReference      = paymentReference?.trim() || "";
    (doc as any).paymentNote           = paymentNote?.trim() || "";
    (doc as any).notes                 = notes?.trim() || "";
    (doc as any).updatedBy             = session.userId;

    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000)
      return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}

// ─────────────────────────────────────────────
// PATCH /api/erp/sale-returns/:id  (action: CANCEL)
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const body   = await req.json().catch(() => ({}));
    const action = String(body?.action || "").toUpperCase();
    if (action !== "CANCEL")
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });

    const doc = await SaleReturn.findOne({ _id: id, companyId: session.companyId });
    if (!doc)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((doc as any).status === "CANCELLED")
      return NextResponse.json({ error: "ALREADY_CANCELLED" }, { status: 400 });
    if ((doc as any).status !== "FINAL")
      return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });

    // ── reverse stock (returns added stock, so cancel removes it) ──
    const items = (doc as any).items || [];
    for (const it of items) {
      const prod = await Product.findOne({
        _id: it.productId,
        companyId: session.companyId,
        isActive: true,
      })
        .select("_id manageStock")
        .lean();
      if (!prod?.manageStock) continue;
      await Product.updateOne(
        { _id: it.productId, companyId: session.companyId, isActive: true },
        { $inc: { currentStock: -Number(it.qty || 0) } }
      );
    }

    // ✅ FIX: use dueAmount (not grandTotal) to reverse customer due
    const dueToReverse = Number((doc as any).dueAmount || 0);
    if (dueToReverse > 0) {
      await Customer.updateOne(
        {
          _id: (doc as any).customerId,
          companyId: session.companyId,
          // ✅ FIX: include BOTH type customers
          contactType: { $in: ["CUSTOMER", "BOTH"] },
        },
        { $inc: { "totals.totalSaleReturnDue": -dueToReverse } }
      );
    }

    (doc as any).status    = "CANCELLED";
    (doc as any).updatedBy = session.userId;
    await doc.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/erp/sale-returns/:id  (DRAFT only)
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const doc = await SaleReturn.findOne({ _id: id, companyId: session.companyId })
      .select("_id status")
      .lean();
    if (!doc)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((doc as any).status !== "DRAFT")
      return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    const result = await SaleReturn.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}