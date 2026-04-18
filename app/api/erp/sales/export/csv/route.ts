import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Sale from "@/models/Sale";

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
    const status = (url.searchParams.get("status") || "").trim();
    const customerId = (url.searchParams.get("customerId") || "").trim();
    const locationId = (url.searchParams.get("locationId") || "").trim();

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (locationId) filter.locationId = locationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
        { customerNameSnapshot: new RegExp(q, "i") },
      ];
    }

    const rows = await Sale.find(filter)
      .sort({ saleDate: -1, createdAt: -1 })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "createdBy", select: "name email" })
      .lean();

    const headers = [
      "Date",
      "Reference No",
      "Customer",
      "Location",
      "Status",
      "Grand Total",
      "Paid Amount",
      "Due Amount",
      "Payment Status",
      "Payment Method",
      "Added By",
      "Created At",
    ];
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((row: any) => {
        const loc = row.locationId?.name || "";
        const addedBy = row.createdBy?.name || row.createdBy?.email || "";
        return [
          row.saleDate ? new Date(row.saleDate).toISOString() : "",
          row.referenceNo,
          row.customerNameSnapshot || "",
          loc,
          row.status,
          Number(row.grandTotal || 0),
          Number(row.paidAmount || 0),
          Number(row.dueAmount || 0),
          row.paymentStatus || "UNPAID",
          row.paymentMethod || "",
          addedBy,
          row.createdAt ? new Date(row.createdAt).toISOString() : "",
        ]
          .map(csvEscape)
          .join(",");
      }),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
