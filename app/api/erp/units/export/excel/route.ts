import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Unit from "@/models/Unit";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const filter: any = { companyId: session.companyId, isActive: true };
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { short: new RegExp(q, "i") }];

    const rows = await Unit.find(filter).sort({ createdAt: -1 }).lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Units");

    ws.columns = [
      { header: "Name", key: "name", width: 22 },
      { header: "Short name", key: "short", width: 15 },
      { header: "Allow decimal", key: "allowDecimal", width: 14 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    rows.forEach((r: any) => {
      ws.addRow({
        name: r.name,
        short: r.short,
        allowDecimal: r.allowDecimal ? "Yes" : "No",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      });
    });

    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="units.xlsx"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}