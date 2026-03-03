import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

    const [rows, cats, units] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).lean(),
      Category.find({ companyId: session.companyId, isActive: true }).select("name").lean(),
      Unit.find({ companyId: session.companyId, isActive: true }).select("name short").lean(),
    ]);

    const catMap = new Map<string, any>(cats.map((c: any) => [String(c._id), c]));
    const unitMap = new Map<string, any>(units.map((u: any) => [String(u._id), u]));

    const headers = ["SKU", "Product", "Category", "Unit", "Current Stock", "Purchase Price", "Selling Price", "Stock Value (purchase)", "Stock Value (sale)"];

    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((p: any) => {
        const cat = catMap.get(String(p.categoryId))?.name || "";
        const unit = unitMap.get(String(p.unitId));
        const unitLabel = unit ? `${unit.name} (${unit.short})` : "";
        const stock = Number(p.currentStock || 0);
        const pp = Number(p.purchasePrice || 0);
        const sp = Number(p.sellingPrice || 0);
        return [p.sku, p.name, cat, unitLabel, stock, pp, sp, stock * pp, stock * sp].map(csvEscape).join(",");
      }),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="stock-report.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}