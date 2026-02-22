import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { blockSamePasswordAcrossCompanies } from "@/lib/checkHelper";

function intersectAllowed(userMods: string[], enabledMods: string[]) {
  const set = new Set(enabledMods || []);
  return (userMods || []).filter((m) => set.has(m));
}

function intersectAllowedSettings(userSettings: string[], enabledSettings: string[]) {
  const set = new Set(enabledSettings || []);
  return (userSettings || []).filter((s) => set.has(s));
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    // ✅ Owner sees: all non-owner users (ADMIN + STAFF)
    // ✅ Admin (non-owner) sees: only STAFF, and not himself
    const base: any = {
      companyId: session.companyId,
      isOwner: { $ne: true },
    };

    if (!session.isOwner) {
      base.role = "STAFF";
      base._id = { $ne: session.userId }; // ✅ don't show self
    }

    const users = await CompanyUser.find(base)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);

    const {
      email,
      password,
      name,
      phone,
      role, // may come from UI
      allowedModules = [],
      allowedSettings = [],
    } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "name/email/password required" },
        { status: 400 },
      );
    }

    await connectDB();

    const company = await Company.findById(session.companyId)
      .select("maxUsers enabledModules enabledSettings")
      .lean();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // ✅ user limit (excluding owner)
    const count = await CompanyUser.countDocuments({
      companyId: session.companyId,
      isOwner: { $ne: true },
    });

    if (count >= Number((company as any).maxUsers || 1)) {
      return NextResponse.json({ error: "User limit reached" }, { status: 403 });
    }

    const e = String(email).toLowerCase().trim();
    const p = String(password);

    // ✅ Cross-company same password restriction
    const blocked = await blockSamePasswordAcrossCompanies({
      email: e,
      companyId: String(session.companyId),
      plainPassword: p,
    });

    if (blocked) {
      return NextResponse.json(
        { error: "SAME_PASSWORD_NOT_ALLOWED_ACROSS_COMPANIES" },
        { status: 409 },
      );
    }

    // ✅ FINAL ROLE RULE:
    // Only Owner can create ADMIN. Admin can create only STAFF.
    const finalRole = session.isOwner ? (role === "ADMIN" ? "ADMIN" : "STAFF") : "STAFF";

    const enabled = ((company as any).enabledModules || []) as string[];
    const finalModules = intersectAllowed(
      Array.isArray(allowedModules) ? allowedModules : [],
      enabled,
    );

    const enabledSettings = (((company as any).enabledSettings || []) as string[]) || [];
    let finalSettings = intersectAllowedSettings(
      Array.isArray(allowedSettings) ? allowedSettings : [],
      enabledSettings,
    );

    if (!finalModules.includes("SETTINGS")) finalSettings = [];

    const passwordHash = await bcrypt.hash(p, 10);

    const user = await CompanyUser.create({
      companyId: session.companyId,
      email: e,
      passwordHash,
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      role: finalRole,
      allowedModules: finalModules,
      allowedSettings: finalSettings,
      isActive: true,
      isOwner: false,
      lockedBySuper: false,
    });

    const safe = await CompanyUser.findById(user._id).select("-passwordHash").lean();
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (err: any) {
    // duplicate
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_EXISTS_IN_COMPANY" },
        { status: 409 },
      );
    }
    return authErrorResponse(err);
  }
}