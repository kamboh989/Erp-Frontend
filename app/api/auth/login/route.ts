import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { setCompanyCookie } from "@/lib/auth";

function intersectAllowedSettings(userSettings: string[], enabledSettings: string[]) {
  const set = new Set(enabledSettings || []);
  return (userSettings || []).filter((s) => set.has(s));
}

export async function POST(req: NextRequest) {
  const { email, password, companyId } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "email/password required" },
      { status: 400 },
    );
  }

  await connectDB();
  const e = String(email).toLowerCase().trim();

  // 0) find all active users across companies for this email
  const matches = await CompanyUser.find({ email: e, isActive: true })
    .select("_id companyId isOwner createdAt")
    .lean();

  // If no user found by CompanyUser, fallback to old owner logic (optional)
  if (matches.length === 0) {
    // 2) FALLBACK: Company email (OWNER) - keep your old behavior if needed
    const company = await Company.findOne({ email: e })
      .select("isActive enabledModules enabledSettings companyName")
      .lean();

    if (!company)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    if (company.isActive === false) {
      return NextResponse.json(
        { error: "Company is inactive" },
        { status: 403 },
      );
    }

    const ownerUser = await CompanyUser.findOne({
      companyId: company._id,
      email: e,
      isActive: true,
    })
      .select("passwordHash email name role isOwner allowedModules allowedSettings companyId")
      .lean();

    if (!ownerUser) {
      return NextResponse.json(
        { error: "Owner user not found in CompanyUser" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(String(password), (ownerUser as any).passwordHash);
    if (!ok)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );

    const enabled = new Set<string>(((company as any).enabledModules || []) as string[]);
    const allowed = (((ownerUser as any).allowedModules || []) as string[]).filter((m) =>
      enabled.has(m),
    );

    // ✅ settings
    const enabledSettings = (((company as any).enabledSettings || []) as string[]) || [];
    let allowedSettings = intersectAllowedSettings(
      (((ownerUser as any).allowedSettings || []) as string[]),
      enabledSettings,
    );
    if (!allowed.includes("SETTINGS")) allowedSettings = [];

    const res = NextResponse.json({ ok: true, kind: "company_owner" });

    setCompanyCookie(res, {
      userId: String((ownerUser as any)._id),
      companyId: String((company as any)._id),
      email: (ownerUser as any).email,
      name: (ownerUser as any).name || "",
      companyName: (company as any).companyName || "",
      role: ((ownerUser as any).role || "ADMIN") as any,
      isOwner: true,
      allowedModules: allowed,
      allowedSettings: [], // ✅ REQUIRED now
    });

    return res;
  }

  // 1) if email exists in multiple companies, and companyId not provided => ask user to pick
  const uniqueCompanyIds = Array.from(
    new Set(matches.map((m) => String(m.companyId))),
  );

  if (!companyId && uniqueCompanyIds.length > 1) {
    const companies = await Company.find({ _id: { $in: uniqueCompanyIds } })
      .select("companyName isActive")
      .lean();

    const activeCompanies = companies
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        companyId: String((c as any)._id),
        companyName: (c as any).companyName || "Company",
      }));

    return NextResponse.json(
      { error: "MULTIPLE_COMPANIES", companies: activeCompanies },
      { status: 409 },
    );
  }

  // 2) determine final companyId (if only 1 match and companyId not provided, auto pick it)
  const finalCompanyId = companyId ? String(companyId) : uniqueCompanyIds[0];

  // 3) now ALWAYS find user inside company scope
  const user = await CompanyUser.findOne({
    email: e,
    companyId: finalCompanyId,
    isActive: true,
  })
    .sort({ isOwner: 1, createdAt: -1 })
    .select("passwordHash email name role isOwner allowedModules allowedSettings companyId")
    .lean();

  if (!user)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const company = await Company.findById((user as any).companyId)
    .select("isActive enabledModules enabledSettings companyName")
    .lean();

  if (!company)
    return NextResponse.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  if ((company as any).isActive === false) {
    return NextResponse.json({ error: "Company is inactive" }, { status: 403 });
  }

  const ok = await bcrypt.compare(String(password), (user as any).passwordHash);
  if (!ok)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const enabled = new Set<string>(((company as any).enabledModules || []) as string[]);
  const allowed = (((user as any).allowedModules || []) as string[]).filter((m) =>
    enabled.has(m),
  );

  // ✅ settings
  const enabledSettings = (((company as any).enabledSettings || []) as string[]) || [];
  let allowedSettings = intersectAllowedSettings(
    (((user as any).allowedSettings || []) as string[]),
    enabledSettings,
  );
  if (!allowed.includes("SETTINGS")) allowedSettings = [];

  const res = NextResponse.json({
    ok: true,
    kind: (user as any).isOwner ? "company_owner" : "company_user",
  });

  setCompanyCookie(res, {
    userId: String((user as any)._id),
    companyId: String((company as any)._id),
    email: (user as any).email,
    name: (user as any).name || "",
    companyName: (company as any).companyName || "",
    role: ((user as any).role || ((user as any).isOwner ? "ADMIN" : "STAFF")) as any,
    isOwner: Boolean((user as any).isOwner),
    allowedModules: allowed,
    allowedSettings: [], // ✅ REQUIRED now
  });

  return res;
}