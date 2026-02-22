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

    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ✅ Owner can edit anyone (except locked-by-super rules)
    // ✅ Admin (non-owner) can edit ONLY STAFF and NOT himself
    if (!session.isOwner) {
      if (String(target._id) === String(session.userId)) {
        return NextResponse.json({ error: "FORBIDDEN_SELF_EDIT" }, { status: 403 });
      }
      if ((target as any).role === "ADMIN" || (target as any).isOwner) {
        return NextResponse.json({ error: "FORBIDDEN_ADMIN_TARGET" }, { status: 403 });
      }
    }

    // company config
    const company = await Company.findById(session.companyId)
      .select("enabledModules enabledSettings")
      .lean();

    const enabled = (company?.enabledModules || []) as string[];
    const enabledSettings = ((company as any)?.enabledSettings || []) as string[];

    // --- Intended email
    const nextEmail =
      body.email !== undefined
        ? String(body.email).toLowerCase().trim()
        : String((target as any).email);

    // if email changing and exists elsewhere, require password same request
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
    if (body.name !== undefined) (target as any).name = String(body.name).trim();
    if (body.phone !== undefined) (target as any).phone = String(body.phone).trim();
    if (body.email !== undefined) (target as any).email = nextEmail;

    // ✅ ROLE UPDATE RULE:
    // - Only Owner can set ADMIN
    // - Admin (non-owner) cannot change role at all (force STAFF)
    if (body.role !== undefined) {
      if (!session.isOwner) {
        // ignore / enforce staff
        (target as any).role = "STAFF";
      } else {
        (target as any).role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
      }
    }

    // modules
    if (body.allowedModules !== undefined) {
      const mods = Array.isArray(body.allowedModules) ? body.allowedModules : [];
      (target as any).allowedModules = intersectAllowed(mods, enabled);
    }

    // settings
    if (body.allowedSettings !== undefined) {
      const s = Array.isArray(body.allowedSettings) ? body.allowedSettings : [];
      let finalSettings = intersectAllowedSettings(s, enabledSettings);

      if (!((target as any).allowedModules || []).includes("SETTINGS")) finalSettings = [];
      (target as any).allowedSettings = finalSettings;
    }

    // password reset
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
        excludeUserId: String((target as any)._id),
      });

      if (blocked) {
        return NextResponse.json(
          { error: "SAME_PASSWORD_NOT_ALLOWED_ACROSS_COMPANIES" },
          { status: 409 },
        );
      }

      (target as any).passwordHash = await bcrypt.hash(nextPass, 10);
      changedPassword = true;
    }

    // active toggle
    if (body.isActive !== undefined) {
      const nextActive = Boolean(body.isActive);

      if (nextActive === true && (target as any).lockedBySuper) {
        return NextResponse.json(
          { error: "LOCKED_BY_SUPER_ADMIN" },
          { status: 403 },
        );
      }

      (target as any).isActive = nextActive;
    }

    await target.save();

    const safe = await CompanyUser.findById((target as any)._id)
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

    // ✅ Admin (non-owner) can delete only STAFF (not admin)
    if (!session.isOwner && (target as any).role === "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN_ADMIN_TARGET" }, { status: 403 });
    }

    // strict confirm
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