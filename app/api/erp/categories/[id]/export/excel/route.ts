import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Category from "@/models/Category";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const filter: any = { companyId: session.companyId, isActive: true };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { code: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
      ];
    }

    const rows = await Category.find(filter).sort({ createdAt: -1 }).lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Categories");

    ws.columns = [
      { header: "Category", key: "name", width: 25 },
      { header: "Category Code", key: "code", width: 18 },
      { header: "Description", key: "description", width: 30 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    rows.forEach((r: any) => {
      ws.addRow({
        name: r.name,
        code: r.code || "",
        description: r.description || "",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      });
    });

    ws.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="categories.xlsx"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}