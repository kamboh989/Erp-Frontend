import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";

function nnum(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params;
    const body = await req.json();

    const nextOpening = Math.max(0, nnum(body?.openingStock));

    const p = await Product.findOne({ _id: id, companyId: session.companyId, isActive: true }).lean();
    if (!p) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (!p.manageStock) {
      return NextResponse.json({ error: "MANAGE_STOCK_OFF" }, { status: 400 });
    }

    const oldOpening = Number(p.openingStock || 0);
    const oldCurrent = Number(p.currentStock || 0);

    const diff = nextOpening - oldOpening;
    const nextCurrent = Math.max(0, oldCurrent + diff);

    const updated = await Product.findOneAndUpdate(
      { _id: id, companyId: session.companyId, isActive: true },
      { $set: { openingStock: nextOpening, currentStock: nextCurrent } },
      { returnDocument: "after" }
    ).lean();

    return NextResponse.json({ row: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}