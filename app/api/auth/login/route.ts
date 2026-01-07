import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { setCompanyCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { companyEmail, email, password } = await req.json();

  if (!companyEmail || !email || !password) {
    return NextResponse.json(
      { error: "companyEmail/email/password required" },
      { status: 400 }
    );
  }

  await connectDB();

  const ce = String(companyEmail).toLowerCase().trim();
  const ue = String(email).toLowerCase().trim();

  // ✅ company identify by companyEmail (owner email)
  const company = await Company.findOne({ email: ce, isActive: true }).lean();
  if (!company) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // ✅ user inside this company by user email
  const user = await CompanyUser.findOne({
    companyId: company._id,
    email: ue,
    isActive: true,
  }).lean();

  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // ✅ allowedModules = user.allowedModules ∩ company.enabledModules
  const enabled = new Set<string>((company.enabledModules || []) as string[]);
  const allowed = ((user.allowedModules || []) as string[]).filter((m) => enabled.has(m));

  const res = NextResponse.json({ ok: true });

  setCompanyCookie(res, {
    userId: String(user._id),
    companyId: String(company._id),
    email: user.email,
    name: user.name || "",
    role: (user.role || "STAFF") as any,
    isOwner: Boolean(user.isOwner),
    allowedModules: allowed,
  });

  return res;
}
