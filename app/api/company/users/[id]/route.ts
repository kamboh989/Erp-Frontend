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

  if (target.isOwner && !session.isOwner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const company = await Company.findById(session.companyId).select("enabledModules").lean();
  const enabled = (company?.enabledModules || []) as string[];

  if (body.name !== undefined) target.name = String(body.name).trim();
  if (body.phone !== undefined) target.phone = String(body.phone).trim();
  if (body.email !== undefined) target.email = String(body.email).toLowerCase().trim();

  // role only admin/owner
  if (body.role !== undefined) {
    if (!(session.isOwner || session.role === "ADMIN")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!target.isOwner) target.role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
  }

  if (body.allowedModules !== undefined) {
    const mods = Array.isArray(body.allowedModules) ? body.allowedModules : [];
    target.allowedModules = intersectAllowed(mods, enabled);
  }

  // ✅ password reset FIXED
  let changedPassword = false;
  if (body.password !== undefined) {
    const nextPass = String(body.password || "").trim();
    if (nextPass.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 chars" }, { status: 400 });
    }
    target.passwordHash = await bcrypt.hash(nextPass, 10);
    changedPassword = true;
  }

  if (body.isActive !== undefined) {
    const nextActive = Boolean(body.isActive);

    // if super locked, company cannot activate
    if (nextActive === true && (target as any).lockedBySuper) {
      return NextResponse.json({ error: "LOCKED_BY_SUPER_ADMIN" }, { status: 403 });
    }

    target.isActive = nextActive;
  }

  await target.save();

  const safe = await CompanyUser.findById(target._id).select("-passwordHash").lean();
  return NextResponse.json({ user: safe, changedPassword });
}
