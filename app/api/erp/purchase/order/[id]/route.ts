import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { isCompanyAdmin } from "@/lib/perm";
import PurchaseOrder from "@/models/PurchaseOrder";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await PurchaseOrder.findOne({ _id: id, companyId: session.companyId })
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      row,
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    if (!isCompanyAdmin(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    await connectDB();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const doc: any = await PurchaseOrder.findOne({ _id: id, companyId: session.companyId });
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (body?.action !== "CANCEL") return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    if (doc.status !== "FINAL") return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });

    doc.status = "CANCELLED";
    doc.cancelledAt = new Date();
    doc.updatedBy = session.userId;
    await doc.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    if (!isCompanyAdmin(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    await connectDB();
    const { id } = await ctx.params;

    const doc: any = await PurchaseOrder.findOne({ _id: id, companyId: session.companyId }).lean();
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // ✅ Only DRAFT delete allowed
    if (doc.status !== "DRAFT") return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    await PurchaseOrder.deleteOne({ _id: id, companyId: session.companyId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}