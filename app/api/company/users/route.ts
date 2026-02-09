import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";
import { requireCompanyAuth } from "@/lib/auth";
import { blockSamePasswordAcrossCompanies } from "@/lib/checkHelper";

function intersectAllowed(userMods: string[], enabledMods: string[]) {
  const set = new Set(enabledMods || []);
  return (userMods || []).filter((m) => set.has(m));
}

export async function GET(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  await connectDB();

  // ✅ client admin ko owner show nahi hoga
  const users = await CompanyUser.find({
    companyId: session.companyId,
    isOwner: { $ne: true },
  })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  const {
    email,
    password,
    name,
    phone,
    role,
    allowedModules = [],
  } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "name/email/password required" },
      { status: 400 },
    );
  }

  await connectDB();

  const company = await Company.findById(session.companyId)
    .select("maxUsers enabledModules")
    .lean();
  if (!company)
    return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // ✅ LIMIT: owner count nahi hoga
  const count = await CompanyUser.countDocuments({
    companyId: session.companyId,
    isOwner: { $ne: true },
  });

  if (count >= Number(company.maxUsers || 1)) {
    return NextResponse.json({ error: "User limit reached" }, { status: 403 });
  }

  const e = String(email).toLowerCase().trim();
  const p = String(password);

  // ✅ NEW: Cross-company same password restriction for same email
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

  // staff cannot create ADMIN
  const finalRole =
    session.isOwner || session.role === "ADMIN"
      ? role === "ADMIN"
        ? "ADMIN"
        : "STAFF"
      : "STAFF";

  const finalModules = intersectAllowed(
    Array.isArray(allowedModules) ? allowedModules : [],
    (company.enabledModules || []) as string[],
  );

  const passwordHash = await bcrypt.hash(p, 10);

  try {
    const user = await CompanyUser.create({
      companyId: session.companyId,
      email: e,
      passwordHash,
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      role: finalRole,
      allowedModules: finalModules,
      isActive: true,
      isOwner: false,
      lockedBySuper: false,
    });

    const safe = await CompanyUser.findById(user._id)
      .select("-passwordHash")
      .lean();
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (err: any) {
    // ✅ if same email inside same company due to unique index
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_EXISTS_IN_COMPANY" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
