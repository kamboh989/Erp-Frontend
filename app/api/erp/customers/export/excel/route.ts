import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/models/Customer";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { listScopeFilter } from "@/lib/perm";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const filter: any = {
      companyId: session.companyId,
      ...listScopeFilter(session),
      contactType: { $in: ["CUSTOMER", "BOTH"] },
    };

    if (q) {
      filter.$or = [
        { contactId: new RegExp(q, "i") },
        { name: new RegExp(q, "i") },
        { businessName: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { mobile: new RegExp(q, "i") },
      ];
    }

    const rows = await Contact.find(filter).sort({ createdAt: -1 }).lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Customers");

    ws.columns = [
      { header: "Contact ID", key: "contactId", width: 12 },
      { header: "Business/Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 22 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Opening Balance", key: "openingBalance", width: 16 },
      { header: "Advance Balance", key: "advanceBalance", width: 16 },
      { header: "Total Sale Due", key: "saleDue", width: 14 },
      { header: "Sell Return Due", key: "returnDue", width: 16 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    rows.forEach((r: any) => {
      ws.addRow({
        contactId: r.contactId,
        name: r.businessName || r.name,
        email: r.email || "",
        mobile: r.mobile,
        status: r.status,
        openingBalance: r.totals?.openingBalanceDue ?? 0,
        advanceBalance: r.totals?.advanceBalance ?? 0,
        saleDue: r.totals?.totalSaleDue ?? 0,
        returnDue: r.totals?.totalSaleReturnDue ?? 0,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      });
    });

    ws.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="customers.xlsx"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}