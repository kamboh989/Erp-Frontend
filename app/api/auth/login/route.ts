import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { setCompanyCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "email/password required" }, { status: 400 });
  }

  await connectDB();

  const e = String(email).toLowerCase();

  // company must exist & active
  const company = await Company.findOne({ email: e, isActive: true }).lean();
  if (!company) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // plan expiry check
  const expired =
    company.planExpiresAt && new Date(company.planExpiresAt).getTime() < Date.now();
  if (expired) {
    return NextResponse.json({ error: "PLAN_EXPIRED" }, { status: 403 });
  }

  // user must exist & active
  const user = await CompanyUser.findOne({
    companyId: company._id,
    email: e,
    isActive: true,
  }).lean();

  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const res = NextResponse.json({ ok: true });

  setCompanyCookie(res, {
    userId: String(user._id),
    companyId: String(company._id),
    email: user.email,
    allowedModules: (user.allowedModules || []) as string[],
  });

  return res;
}
