import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import { blockSamePasswordAcrossCompanies } from "@/lib/checkHelper";

function intersectAllowed(userMods: string[], enabledMods: string[]) {
  const set = new Set(enabledMods || []);
  return (userMods || []).filter((m) => set.has(m));
}

function intersectAllowedSettings(userSettings: string[], enabledSettings: string[]) {
  const set = new Set(enabledSettings || []);
  return (userSettings || []).filter((s) => set.has(s));
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    const { id } = await ctx.params;
    const body = await req.json();

    await connectDB();

    const target = await CompanyUser.findOne({
      _id: id,
      companyId: session.companyId,
    });
    if (!target)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (target.isOwner && !session.isOwner) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ✅ enabledSettings add
    const company = await Company.findById(session.companyId)
      .select("enabledModules enabledSettings")
      .lean();

    const enabled = (company?.enabledModules || []) as string[];
    const enabledSettings = ((company as any)?.enabledSettings || []) as string[];

    // --- Detect intended email
    const nextEmail =
      body.email !== undefined
        ? String(body.email).toLowerCase().trim()
        : String(target.email);

    // ✅ If email is being changed AND that email exists in other companies,
    // require password in same request
    if (body.email !== undefined) {
      const existsElsewhere = await CompanyUser.exists({
        email: nextEmail,
        companyId: { $ne: session.companyId },
        isActive: true,
      });

      if (existsElsewhere && body.password === undefined) {
        return NextResponse.json(
          { error: "PASSWORD_REQUIRED_WHEN_EMAIL_USED_IN_OTHER_COMPANY" },
          { status: 409 },
        );
      }
    }

    // --- Apply basic fields
    if (body.name !== undefined) target.name = String(body.name).trim();
    if (body.phone !== undefined) target.phone = String(body.phone).trim();
    if (body.email !== undefined) target.email = nextEmail;

    // role only admin/owner
    if (body.role !== undefined) {
      if (!(session.isOwner || session.role === "ADMIN")) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      if (!target.isOwner)
        target.role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
    }

    if (body.allowedModules !== undefined) {
      const mods = Array.isArray(body.allowedModules) ? body.allowedModules : [];
      target.allowedModules = intersectAllowed(mods, enabled);
    }

    // ✅ NEW allowedSettings (trim)
    if (body.allowedSettings !== undefined) {
      const s = Array.isArray(body.allowedSettings) ? body.allowedSettings : [];
      let finalSettings = intersectAllowedSettings(s, enabledSettings);

      // optional gate: if SETTINGS module not allowed -> empty
      if (!(target.allowedModules || []).includes("SETTINGS")) finalSettings = [];
      (target as any).allowedSettings = finalSettings;
    }

    // ✅ password reset with restriction
    let changedPassword = false;
    if (body.password !== undefined) {
      const nextPass = String(body.password || "").trim();
      if (nextPass.length < 4) {
        return NextResponse.json(
          { error: "Password must be at least 4 chars" },
          { status: 400 },
        );
      }

      const blocked = await blockSamePasswordAcrossCompanies({
        email: nextEmail,
        companyId: String(session.companyId),
        plainPassword: nextPass,
        excludeUserId: String(target._id),
      });

      if (blocked) {
        return NextResponse.json(
          { error: "SAME_PASSWORD_NOT_ALLOWED_ACROSS_COMPANIES" },
          { status: 409 },
        );
      }

      target.passwordHash = await bcrypt.hash(nextPass, 10);
      changedPassword = true;
    }

    if (body.isActive !== undefined) {
      const nextActive = Boolean(body.isActive);

      if (nextActive === true && (target as any).lockedBySuper) {
        return NextResponse.json(
          { error: "LOCKED_BY_SUPER_ADMIN" },
          { status: 403 },
        );
      }

      target.isActive = nextActive;
    }

    try {
      await target.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "EMAIL_ALREADY_EXISTS_IN_COMPANY" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }

    const safe = await CompanyUser.findById(target._id)
      .select("-passwordHash")
      .lean();

    return NextResponse.json({ user: safe, changedPassword });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();

    const { id } = await ctx.params;

    const target = await CompanyUser.findOne({
      _id: id,
      companyId: session.companyId,
    }).lean();

    if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((target as any).isOwner) {
      return NextResponse.json({ error: "OWNER_CANNOT_BE_DELETED" }, { status: 400 });
    }

    // ✅ strict confirm = TARGET user's own email/password
    const body = await req.json().catch(() => ({} as any));
    const confirmEmail = String(body?.email || "").toLowerCase().trim();
    const confirmPassword = String(body?.password || "");

    if (!confirmEmail || !confirmPassword) {
      return NextResponse.json({ error: "CONFIRM_REQUIRED" }, { status: 400 });
    }

    if (confirmEmail !== String((target as any).email || "").toLowerCase().trim()) {
      return NextResponse.json({ error: "CONFIRM_INVALID" }, { status: 401 });
    }

    const ok = await bcrypt.compare(confirmPassword, (target as any).passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "CONFIRM_INVALID" }, { status: 401 });
    }

    await CompanyUser.deleteOne({ _id: id, companyId: session.companyId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}