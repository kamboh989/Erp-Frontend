import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    // only allow deactivation for now
    if (body?.isActive !== false) {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const updated = await Product.findOneAndUpdate(
      { _id: id, companyId: session.companyId, isActive: true },
      { $set: { isActive: false } },
      { returnDocument: "after" } // ✅ mongoose new option
    ).lean();

    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}