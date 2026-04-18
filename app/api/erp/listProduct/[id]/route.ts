import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;
    const row = await Product.findOne({ _id: id, companyId: session.companyId, isActive: true })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "unitId", select: "name short" })
      .lean();
    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const sku = String(body?.sku || "").trim().toUpperCase();
    const categoryId = String(body?.categoryId || "").trim();
    const unitId = String(body?.unitId || "").trim();

    if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
    if (!sku) return NextResponse.json({ error: "SKU_REQUIRED" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "CATEGORY_REQUIRED" }, { status: 400 });
    if (!unitId) return NextResponse.json({ error: "UNIT_REQUIRED" }, { status: 400 });

    const [catOk, unitOk] = await Promise.all([
      Category.findOne({ _id: categoryId, companyId: session.companyId, isActive: true }).lean(),
      Unit.findOne({ _id: unitId, companyId: session.companyId, isActive: true }).lean(),
    ]);
    if (!catOk) return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    if (!unitOk) return NextResponse.json({ error: "INVALID_UNIT" }, { status: 400 });

    const product = await Product.findOne({ _id: id, companyId: session.companyId, isActive: true });
    if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    (product as any).name = name;
    (product as any).sku = sku;
    (product as any).categoryId = categoryId;
    (product as any).unitId = unitId;
    (product as any).manageStock = Boolean(body?.manageStock);
    (product as any).alertQty = Math.max(0, Number(body?.alertQty || 0));
    (product as any).purchasePrice = Math.max(0, Number(body?.purchasePrice || 0));
    (product as any).sellingPrice = Math.max(0, Number(body?.sellingPrice || 0));

    await product.save();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 11000) return NextResponse.json({ error: "SKU_ALREADY_EXISTS_IN_COMPANY" }, { status: 409 });
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