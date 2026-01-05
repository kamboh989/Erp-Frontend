import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { requireCompanyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  await connectDB();

  const users = await CompanyUser.find({ companyId: session.companyId })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  const { email, password, name, allowedModules = [] } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "email/password required" }, { status: 400 });
  }

  await connectDB();

  const company = await Company.findById(session.companyId).select("maxUsers enabledModules").lean();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const totalUsers = await CompanyUser.countDocuments({ companyId: session.companyId, isActive: true });
  if (totalUsers >= (company.maxUsers || 1)) {
    return NextResponse.json({ error: "User limit reached. Buy more plan." }, { status: 403 });
  }

  // Ensure allowedModules ⊆ company.enabledModules
  const enabled = new Set(company.enabledModules || []);
  const safeAllowed = (allowedModules as string[]).filter((m) => enabled.has(m));

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = await CompanyUser.create({
    companyId: session.companyId,
    email: String(email).toLowerCase(),
    passwordHash,
    name: name?.trim() || "",
    allowedModules: safeAllowed,
    isOwner: false,
    isActive: true,
  });

  return NextResponse.json({ user: { id: String(user._id), email: user.email } }, { status: 201 });
}
