import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Unit from "@/models/Unit";

// ✅ Next.js 15: ctx.params is Promise
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params; // ✅ MUST await

    const body = await req.json().catch(() => ({}));
    const n = String(body?.name || "").trim();
    const s = String(body?.short || "").trim();
    const allowDecimal = Boolean(body?.allowDecimal);

    if (!n || !s) {
      return NextResponse.json(
        { error: "NAME_SHORT_REQUIRED" },
        { status: 400 }
      );
    }

    const updated = await Unit.findOneAndUpdate(
      { _id: id, companyId: session.companyId, isActive: true },
      { $set: { name: n, short: s, allowDecimal } },
      { returnDocument: "after" } // ✅ instead of new:true
    ).lean();

    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ row: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params;

    const updated = await Unit.findOneAndUpdate(
      { _id: id, companyId: session.companyId, isActive: true },
      { $set: { isActive: false } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}