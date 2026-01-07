import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";
import { requireCompanyAuth } from "@/lib/auth";

function intersectAllowed(userMods: string[], enabledMods: string[]) {
  const set = new Set(enabledMods || []);
  return (userMods || []).filter((m) => set.has(m));
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireCompanyAuth(req);
  const { id } = await ctx.params;
  const body = await req.json();

  await connectDB();

  const target = await CompanyUser.findOne({ _id: id, companyId: session.companyId });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ✅ cannot edit owner unless you are owner (optional strictness)
  if (target.isOwner && !session.isOwner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const company = await Company.findById(session.companyId).select("enabledModules").lean();
  const enabled = (company?.enabledModules || []) as string[];

  // fields
  if (body.name !== undefined) target.name = String(body.name).trim();
  if (body.phone !== undefined) target.phone = String(body.phone).trim();

  if (body.email !== undefined) {
    const newEmail = String(body.email).toLowerCase().trim();
    target.email = newEmail;
  }

  // role only admin/owner
  if (body.role !== undefined) {
    if (!(session.isOwner || session.role === "ADMIN")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    // owner stays owner; role can still show ADMIN for owner but keep flag
    if (!target.isOwner) {
      target.role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
    }
  }

  // allowedModules: everyone can assign, but must stay within enabledModules
  if (body.allowedModules !== undefined) {
    const mods = Array.isArray(body.allowedModules) ? body.allowedModules : [];
    target.allowedModules = intersectAllowed(mods, enabled);
  }

  // password reset
  if (body.password !== undefined && String(body.password).length >= 4) {
    target.passwordHash = await bcrypt.hash(String(body.password), 10);
  }

  // activate/deactivate (logout on next /me check)
  if (body.isActive !== undefined) {
    // optional: staff cannot deactivate admins
    if (target.role === "ADMIN" && !(session.isOwner || session.role === "ADMIN")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    target.isActive = Boolean(body.isActive);
  }

  await target.save();

  const safe = await CompanyUser.findById(target._id).select("-passwordHash").lean();
  return NextResponse.json({ user: safe });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireCompanyAuth(req);
  const { id } = await ctx.params;

  // ✅ strict delete => current logged in admin must confirm with email/password
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Confirm email/password required" }, { status: 400 });
  }

  await connectDB();

  // validate current user password
  const me = await CompanyUser.findById(session.userId).lean();
  if (!me) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const ok = await bcrypt.compare(String(password), me.passwordHash);
  if (!ok || String(email).toLowerCase().trim() !== String(me.email).toLowerCase().trim()) {
    return NextResponse.json({ error: "Confirm email/password invalid" }, { status: 401 });
  }

  // only owner/admin can delete
  if (!(session.isOwner || session.role === "ADMIN")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const target = await CompanyUser.findOne({ _id: id, companyId: session.companyId }).lean();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // never delete owner by admin
  if (target.isOwner) {
    return NextResponse.json({ error: "Cannot delete owner" }, { status: 403 });
  }

  // optional safety: cannot delete self
  if (String(target._id) === String(session.userId)) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 403 });
  }

  await CompanyUser.deleteOne({ _id: id, companyId: session.companyId });
  return NextResponse.json({ ok: true });
}
