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
        isActive: true,
      }).select("_id manageStock").lean();

      if (!prod?.manageStock) continue;

      await Product.updateOne(
        { _id: it.productId, companyId: session.companyId, isActive: true },
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