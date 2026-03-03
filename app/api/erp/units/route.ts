import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Unit from "@/models/Unit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 25)));

    const filter: any = { companyId: session.companyId, isActive: true };
    if (q) {
      filter.$or = [{ name: new RegExp(q, "i") }, { short: new RegExp(q, "i") }];
    }

    const total = await Unit.countDocuments(filter);
    const rows = await Unit.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ rows, total });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const { name, short, allowDecimal } = await req.json();
    const n = String(name || "").trim();
    const s = String(short || "").trim();
    if (!n || !s) return NextResponse.json({ error: "NAME_SHORT_REQUIRED" }, { status: 400 });

    try {
      const created = await Unit.create({
        companyId: session.companyId,
        name: n,
        short: s,
        allowDecimal: Boolean(allowDecimal),
        isActive: true,
      });
      return NextResponse.json({ row: created }, { status: 201 });
    } catch (e: any) {
      if (e?.code === 11000) return NextResponse.json({ error: "UNIT_ALREADY_EXISTS" }, { status: 409 });
      return NextResponse.json({ error: "CREATE_FAILED" }, { status: 400 });
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}