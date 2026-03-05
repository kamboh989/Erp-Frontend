import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import Location from "@/models/Location";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session); // ✅ owner/admin only
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));

    const name = body?.name !== undefined ? String(body.name || "").trim() : undefined;
    const isDefault = body?.isDefault !== undefined ? Boolean(body.isDefault) : undefined;

    if (name !== undefined && !name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

    if (isDefault === true) {
      await Location.updateMany({ companyId: session.companyId, isDefault: true }, { $set: { isDefault: false } });
    }

    const set: any = {};
    if (name !== undefined) set.name = name;
    if (isDefault !== undefined) set.isDefault = isDefault;

    const row = await Location.findOneAndUpdate(
      { _id: id, companyId: session.companyId },
      { $set: set },
      { returnDocument: "after" }
    ).lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (err: any) {
    if (err?.code === 11000) return NextResponse.json({ error: "LOCATION_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session); // ✅ owner/admin only
    await connectDB();
    const { id } = await ctx.params;

    const row = await Location.findOneAndUpdate(
      { _id: id, companyId: session.companyId },
      { $set: { isActive: false, isDefault: false } },
      { returnDocument: "after" }
    ).lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}