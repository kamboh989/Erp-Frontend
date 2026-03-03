import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const categoryId = (url.searchParams.get("categoryId") || "").trim();

    const filter: any = { companyId: session.companyId, isActive: true };
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
    if (categoryId) filter.categoryId = categoryId;

    const [rows, cats, units] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).lean(),
      Category.find({ companyId: session.companyId, isActive: true }).select("name").lean(),
      Unit.find({ companyId: session.companyId, isActive: true }).select("name short").lean(),
    ]);

    const catMap = new Map<string, any>(cats.map((c: any) => [String(c._id), c]));
    const unitMap = new Map<string, any>(units.map((u: any) => [String(u._id), u]));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");

    ws.columns = [
      { header: "Product Name", key: "name", width: 22 },
      { header: "SKU", key: "sku", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Unit", key: "unit", width: 18 },
      { header: "Purchase Price", key: "purchasePrice", width: 14 },
      { header: "Selling Price", key: "sellingPrice", width: 14 },
      { header: "Manage Stock", key: "manageStock", width: 12 },
      { header: "Current Stock", key: "currentStock", width: 12 },
    ];

    rows.forEach((p: any) => {
      const cat = catMap.get(String(p.categoryId))?.name || "";
      const unit = unitMap.get(String(p.unitId));
      const unitLabel = unit ? `${unit.name} (${unit.short})` : "";
      ws.addRow({
        name: p.name,
        sku: p.sku,
        category: cat,
        unit: unitLabel,
        purchasePrice: Number(p.purchasePrice || 0),
        sellingPrice: Number(p.sellingPrice || 0),
        manageStock: p.manageStock ? "Yes" : "No",
        currentStock: p.manageStock ? Number(p.currentStock || 0) : "",
      });
    });

    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="products.xlsx"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}