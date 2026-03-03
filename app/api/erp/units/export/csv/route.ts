import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
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

    const filter: any = { companyId: session.companyId, isActive: true };
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { short: new RegExp(q, "i") }];

    const rows = await Unit.find(filter).sort({ createdAt: -1 }).lean();

    const headers = ["Name", "Short name", "Allow decimal", "Created At"];
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((r: any) =>
        [r.name, r.short, r.allowDecimal ? "Yes" : "No", r.createdAt ? new Date(r.createdAt).toISOString() : ""]
          .map(csvEscape)
          .join(",")
      ),
    ];
    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="units.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}