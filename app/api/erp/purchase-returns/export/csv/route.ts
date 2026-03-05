import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import PurchaseReturn from "@/models/PurchaseReturn";

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

    const rows = await PurchaseReturn.find(filter)
      .sort({ returnDate: -1, createdAt: -1 })
      .populate({ path: "locationId", select: "name" })
      .populate({ path: "createdBy", select: "name email" })
      .lean();

    const headers = ["Date", "Reference No", "Supplier", "Location", "Status", "Grand Total", "Added By", "Created At"];

    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((p: any) => {
        const loc = p.locationId?.name || "";
        const addedBy = p.createdBy?.name || p.createdBy?.email || "";
        return [
          p.returnDate ? new Date(p.returnDate).toISOString() : "",
          p.referenceNo,
          p.supplierNameSnapshot || "",
          loc,
          p.status,
          Number(p.grandTotal || 0),
          addedBy,
          p.createdAt ? new Date(p.createdAt).toISOString() : "",
        ]
          .map(csvEscape)
          .join(",");
      }),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purchase_returns.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}