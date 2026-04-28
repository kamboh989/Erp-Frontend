import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Category from "@/models/Category";

// ✅ Next.js 15: params is Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params;

    const row = await Category.findOne({ _id: id, companyId: session.companyId, isActive: true }).lean();
    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    
    return NextResponse.json({ row });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params; // ✅ unwrap params

    const { name, code, description } = await req.json().catch(() => ({}));
    const n = String(name || "").trim();
    if (!n) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

    const updated = await Category.findOneAndUpdate(
      { _id: id, companyId: session.companyId, isActive: true },
      {
        $set: {
          name: n,
          code: String(code || "").trim(),
          description: String(description || "").trim(),
        },
      },
      { returnDocument: "after" } // ✅ mongoose warning fix
    ).lean();

    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ row: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { id } = await ctx.params; // ✅ unwrap params

    const updated = await Category.findOneAndUpdate(
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