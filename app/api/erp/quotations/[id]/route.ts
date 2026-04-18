import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse, requireCompanyAdmin } from "@/lib/auth";

import Quotation from "@/models/Quotation";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await Quotation.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "customerId", select: "name businessName mobile moreInfo" })
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "updatedBy", select: "name email role" })
      .populate({ path: "items.productId", select: "name sku" })
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Ensure items have snapshots
    if (row.items) {
      row.items = row.items.map((it: any) => ({
        ...it,
        nameSnapshot: it.nameSnapshot || it.productId?.name || "",
        skuSnapshot: it.skuSnapshot || it.productId?.sku || "",
      }));
    }

    return NextResponse.json({
      row: {
        ...row,
        locationName: (row as any).locationId?.name || "",
        customerNameSnapshot: (row as any).customerId ? ((row as any).customerId.businessName || (row as any).customerId.name) : "",
      },
      can: {
        admin: Boolean(session.isOwner || session.role === "ADMIN"),
        update: true,
        delete: Boolean(session.isOwner || session.role === "ADMIN"),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    // Staff can edit quotations (no requireCompanyAdmin)
    await connectDB();
    const { id } = await ctx.params;

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
    if (!referenceNo?.trim()) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const customer = await Customer.findOne({
      _id: customerId,
      companyId: session.companyId,
      contactType: { $in: ["CUSTOMER", "BOTH"] },
    })
      .select("_id name businessName")
      .lean();

    if (!customer) return NextResponse.json({ error: "INVALID_CUSTOMER" }, { status: 400 });

    const quotation = await Quotation.findOne({ _id: id, companyId: session.companyId });
    if (!quotation) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Check reference uniqueness
    const existing = await Quotation.findOne({
      _id: { $ne: id },
      companyId: session.companyId,
      referenceNo: referenceNo.trim(),
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

    // Update quotation
    (quotation as any).customerId = customerId;
    (quotation as any).customerNameSnapshot = customer.businessName || customer.name;
    (quotation as any).locationId = locationId;
    (quotation as any).quotationDate = new Date(quotationDate || Date.now());
    (quotation as any).expiryDate = expiryDate ? new Date(expiryDate) : null;
    (quotation as any).status = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(status) ? status : "DRAFT";
    (quotation as any).referenceNo = referenceNo.trim();
    (quotation as any).items = validatedItems;
    (quotation as any).subtotal = subtotal;
    (quotation as any).shippingCharges = Number(shippingCharges || 0);
    (quotation as any).grandTotal = grandTotal;
    (quotation as any).notes = notes?.trim() || "";
    (quotation as any).updatedBy = session.userId;

    await quotation.save();

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

    const quotation = await Quotation.findOne({ _id: id, companyId: session.companyId }).select("_id status").lean();
    if (!quotation) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((quotation as any).status !== "DRAFT") return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    const result = await Quotation.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}