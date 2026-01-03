import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Company from "@/models/company";
import User from "@/models/user";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  const { name, enabledModules } = await req.json();

  await connectDB();
  const company = await Company.findByIdAndUpdate(
    params.id,
    { ...(name !== undefined ? { name } : {}), ...(enabledModules ? { enabledModules } : {}) },
    { new: true }
  ).lean();

  return NextResponse.json({ company });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  await connectDB();

  // optional: also delete users of that company OR block deletion if users exist
  await User.deleteMany({ companyId: params.id });
  await Company.findByIdAndDelete(params.id);

  return NextResponse.json({ ok: true });
}
