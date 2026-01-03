import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import Company from "@/models/company";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  const { name, role, companyId, allowedModules, isActive } = await req.json();

  await connectDB();

  // optional: auto-enable modules into company like create
  if (companyId && Array.isArray(allowedModules)) {
    const company = await Company.findById(companyId);
    if (company) {
      const enabled = new Set(company.enabledModules || []);
      let changed = false;
      for (const m of allowedModules) {
        if (!enabled.has(m)) { enabled.add(m); changed = true; }
      }
      if (changed) {
        company.enabledModules = Array.from(enabled);
        await company.save();
      }
    }
  }

  const user = await User.findByIdAndUpdate(
    params.id,
    { ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(companyId !== undefined ? { companyId } : {}),
      ...(allowedModules !== undefined ? { allowedModules } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    { new: true }
  ).select("-passwordHash").lean();

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  await connectDB();
  await User.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
