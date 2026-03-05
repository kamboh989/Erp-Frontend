import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Purchase from "@/models/Purchase";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const supplierId = (url.searchParams.get("supplierId") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    if (locationId) filter.locationId = locationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { supplierNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const rows = await Purchase.find(filter)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "createdBy", select: "name email" })
      .lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Purchases");

    ws.columns = [
      { header: "Date", key: "date", width: 22 },
      { header: "Reference No", key: "ref", width: 16 },
      { header: "Supplier", key: "supplier", width: 22 },
      { header: "Location", key: "location", width: 18 },
      { header: "Status", key: "status", width: 12 },
      { header: "Grand Total", key: "grandTotal", width: 14 },
      { header: "Added By", key: "addedBy", width: 18 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    rows.forEach((p: any) => {
      ws.addRow({
        date: p.purchaseDate ? new Date(p.purchaseDate).toLocaleString() : "",
        ref: p.referenceNo || "",
        supplier: p.supplierNameSnapshot || "",
        location: p.locationId?.name || "",
        status: p.status || "",
        grandTotal: Number(p.grandTotal || 0),
        addedBy: p.createdBy?.name || p.createdBy?.email || "",
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
      });
    });

    ws.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="purchases.xlsx"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}