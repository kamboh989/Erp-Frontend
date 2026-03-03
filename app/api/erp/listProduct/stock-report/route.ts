import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const categoryId = (url.searchParams.get("categoryId") || "").trim();

    const filter: any = { companyId: session.companyId, isActive: true, manageStock: true };
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
    if (categoryId) filter.categoryId = categoryId;

    const [rows, total, cats, units] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).lean(),
      Product.countDocuments(filter),
      Category.find({ companyId: session.companyId, isActive: true }).select("name").lean(),
      Unit.find({ companyId: session.companyId, isActive: true }).select("name short").lean(),
    ]);

    const catMap = new Map<string, any>(cats.map((c: any) => [String(c._id), c]));
    const unitMap = new Map<string, any>(units.map((u: any) => [String(u._id), u]));

    let totalValuePurchase = 0;
    let totalValueSale = 0;

    const out = rows.map((p: any) => {
      const stock = Number(p.currentStock || 0);
      const pp = Number(p.purchasePrice || 0);
      const sp = Number(p.sellingPrice || 0);

      const stockValuePurchase = stock * pp;
      const stockValueSale = stock * sp;

      totalValuePurchase += stockValuePurchase;
      totalValueSale += stockValueSale;

      const cat = catMap.get(String(p.categoryId));
      const unit = unitMap.get(String(p.unitId));

      return {
        _id: String(p._id),
        sku: p.sku,
        name: p.name,

        categoryName: cat?.name || "",
        unitName: unit?.name || "",
        unitShort: unit?.short || "",

        manageStock: true,
        currentStock: stock,

        purchasePrice: pp,
        sellingPrice: sp,

        stockValuePurchase,
        stockValueSale,
      };
    });

    return NextResponse.json({
      rows: out,
      total,
      totals: {
        purchase: totalValuePurchase,
        sale: totalValueSale,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}