import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";

import PurchaseReturn from "@/models/PurchaseReturn";
import Supplier from "@/models/Supplier";
import Product from "@/models/Product";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await PurchaseReturn.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "locationId", select: "name" })
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
    if (action !== "CANCEL") return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });

    const doc = await PurchaseReturn.findOne({ _id: id, companyId: session.companyId });
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if ((doc as any).status === "CANCELLED") return NextResponse.json({ error: "ALREADY_CANCELLED" }, { status: 400 });
    if ((doc as any).status !== "FINAL") return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });

    const items = (doc as any).items || [];

    // reverse stock decrease => increase back
    for (const it of items) {
      const prod = await Product.findOne({ _id: it.productId, companyId: session.companyId })
        .select("_id manageStock")
        .lean();

      if (!prod?.manageStock) continue;

      await Product.updateOne(
        { _id: it.productId, companyId: session.companyId },
        { $inc: { currentStock: Number(it.qty || 0) } }
      );
    }

    // reverse supplier return due
    await Supplier.updateOne(
      { _id: (doc as any).supplierId, companyId: session.companyId, contactType: "SUPPLIER" },
      { $inc: { "totals.totalPurchaseReturnDue": -Number((doc as any).grandTotal || 0) } }
    );

    (doc as any).status = "CANCELLED";
    (doc as any).updatedBy = session.userId;
    await doc.save();

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

    const doc = await PurchaseReturn.findOne({ _id: id, companyId: session.companyId }).select("_id status").lean();
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((doc as any).status !== "DRAFT") return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    const result = await PurchaseReturn.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}