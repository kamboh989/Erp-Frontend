import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/models/Customer";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { listScopeFilter } from "@/lib/perm";

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

    const headers = [
      "Contact ID",
      "Business/Name",
      "Email",
      "Mobile",
      "Status",
      "Opening Balance Due",
      "Advance Balance",
      "Total Sale Due",
      "Total Sell Return Due",
      "Created At",
    ];

    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((r: any) =>
        [
          r.contactId,
          r.businessName || r.name,
          r.email,
          r.mobile,
          r.status,
          r.totals?.openingBalanceDue ?? 0,
          r.totals?.advanceBalance ?? 0,
          r.totals?.totalSaleDue ?? 0,
          r.totals?.totalSaleReturnDue ?? 0,
          r.createdAt,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}