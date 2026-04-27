import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";

function nnum(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const categoryId = (url.searchParams.get("categoryId") || "").trim();

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: session.companyId, isActive: true };

    if (q) {
      filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
    }
    if (categoryId) filter.categoryId = categoryId;

    const [rows, total, cats, units] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      Category.find({ companyId: session.companyId, isActive: true }).select("name").sort({ name: 1 }).lean(),
      Unit.find({ companyId: session.companyId, isActive: true }).select("name short allowDecimal").sort({ name: 1 }).lean(),
    ]);

    const catMap = new Map<string, any>(cats.map((c: any) => [String(c._id), c]));
    const unitMap = new Map<string, any>(units.map((u: any) => [String(u._id), u]));

    const out = rows.map((p: any) => {
      const currentStock = Number(p.currentStock ?? 0);
      const alertQty = Number(p.alertQty ?? 0);
      const manageStock = Boolean(p.manageStock);

      return {
        ...p,
        category: catMap.get(String(p.categoryId)) || null,
        unit: unitMap.get(String(p.unitId)) || null,

        // ✅ ERP helper fields (frontend uses this)
        lowStock: manageStock && currentStock <= alertQty,
      };
    });

    return NextResponse.json({ rows: out, total, can: { admin: Boolean(session.isOwner || session.role === "ADMIN") } });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const sku = String(body?.sku || "").trim().toUpperCase();

    const categoryId = String(body?.categoryId || "").trim();
    const unitId = String(body?.unitId || "").trim();

    if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
    if (!sku) return NextResponse.json({ error: "SKU_REQUIRED" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "CATEGORY_REQUIRED" }, { status: 400 });
    if (!unitId) return NextResponse.json({ error: "UNIT_REQUIRED" }, { status: 400 });

    const manageStock = Boolean(body?.manageStock);

    const openingStock = Math.max(0, nnum(body?.openingStock));
    const alertQty = Math.max(0, nnum(body?.alertQty));
    const purchasePrice = Math.max(0, nnum(body?.purchasePrice));
    const sellingPrice = Math.max(0, nnum(body?.sellingPrice));

    // ✅ validate category + unit belongs to company
    const [catOk, unitOk] = await Promise.all([
      Category.findOne({ _id: categoryId, companyId: session.companyId, isActive: true }).lean(),
      Unit.findOne({ _id: unitId, companyId: session.companyId, isActive: true }).lean(),
    ]);
    if (!catOk) return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    if (!unitOk) return NextResponse.json({ error: "INVALID_UNIT" }, { status: 400 });

    const doc = await Product.create({
      companyId: session.companyId,
      name,
      sku,

      categoryId,
      unitId,

      manageStock,

      // ✅ REAL ERP default:
      // manageStock ON => currentStock starts from openingStock
      // manageStock OFF => stock fields become 0
      openingStock: manageStock ? openingStock : 0,
      currentStock: manageStock ? openingStock : 0,
      alertQty: manageStock ? alertQty : 0,

      purchasePrice,
      sellingPrice,

      isActive: true,
    });

    return NextResponse.json({ row: doc }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "SKU_ALREADY_EXISTS_IN_COMPANY" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}