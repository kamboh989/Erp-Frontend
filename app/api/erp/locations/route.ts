import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Location from "@/models/Location";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const rows = await Location.find({ companyId: session.companyId, isActive: true })
      .select("_id name isDefault")
      .sort({ isDefault: -1, name: 1 })
      .lean();

    return NextResponse.json({ rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session); // ✅ owner/admin only
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const isDefault = Boolean(body?.isDefault);

    if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

    if (isDefault) {
      await Location.updateMany({ companyId: session.companyId, isDefault: true }, { $set: { isDefault: false } });
    }

    try {
      const row = await Location.create({ companyId: session.companyId, name, isDefault, isActive: true });
      return NextResponse.json({ row }, { status: 201 });
    } catch (e: any) {
      if (e?.code === 11000) return NextResponse.json({ error: "LOCATION_EXISTS" }, { status: 409 });
      return NextResponse.json({ error: "CREATE_FAILED" }, { status: 400 });
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}