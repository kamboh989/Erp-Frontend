import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import StockTransfer from "@/models/StockTransfer";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const fromLocationId = (url.searchParams.get("fromLocationId") || "").trim();
    const toLocationId = (url.searchParams.get("toLocationId") || "").trim();

    const filter: any = { companyId: session.companyId };
    if (status) filter.status = status;
    if (fromLocationId) filter.fromLocationId = fromLocationId;
    if (toLocationId) filter.toLocationId = toLocationId;

    if (q) {
      filter.$or = [
        { referenceNo: new RegExp(q, "i") },
      ];
    }

    const rows = await StockTransfer.find(filter)
      .sort({ transferDate: -1, createdAt: -1 })
      .populate({ path: "fromLocationId", select: "name" })
      .populate({ path: "toLocationId", select: "name" })
      .populate({ path: "createdBy", select: "name" })
      .lean();

    const csvData = rows.map((r: any) => ({
      "Transfer Date": new Date(r.transferDate).toLocaleDateString(),
      "Reference No": r.referenceNo,
      "From Location": r.fromLocationId?.name || "",
      "To Location": r.toLocationId?.name || "",
      "Status": r.status,
      "Shipping Charges": r.shippingCharges,
      "Subtotal": r.subtotal,
      "Grand Total": r.grandTotal,
      "Added By": r.createdBy?.name || "",
      "Created At": new Date(r.createdAt).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0] || {});
    const csvContent = [
      csvHeaders.join(","),
      ...csvData.map(row => csvHeaders.map(header => `"${row[header] || ""}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=stock-transfers.csv",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}