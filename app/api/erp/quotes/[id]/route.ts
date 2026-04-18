import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Quote from "@/models/Quote";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await Quote.findOne({ _id: id, companyId: session.companyId })
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

    const quote = await Quote.findOne({ _id: id, companyId: session.companyId });
    if (!quote) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((quote as any).status === "CANCELLED") return NextResponse.json({ error: "ALREADY_CANCELLED" }, { status: 400 });
    if ((quote as any).status !== "FINAL") return NextResponse.json({ error: "ONLY_FINAL_CAN_CANCEL" }, { status: 400 });

    (quote as any).status = "CANCELLED";
    (quote as any).updatedBy = session.userId;
    await quote.save();

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

    const quote = await Quote.findOne({ _id: id, companyId: session.companyId }).select("_id status").lean();
    if (!quote) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((quote as any).status !== "DRAFT") return NextResponse.json({ error: "ONLY_DRAFT_CAN_DELETE" }, { status: 400 });

    const result = await Quote.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
