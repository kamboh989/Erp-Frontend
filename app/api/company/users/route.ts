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
  const { email, password, name, phone, role, allowedModules = [] } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "name/email/password required" }, { status: 400 });
  }

  await connectDB();

  const company = await Company.findById(session.companyId).select("maxUsers enabledModules").lean();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const count = await CompanyUser.countDocuments({ companyId: session.companyId });

  if (count >= Number(company.maxUsers || 1)) {
    return NextResponse.json({ error: "User limit reached" }, { status: 403 });
  }

  // ✅ staff cannot create ADMIN
  const finalRole = (session.isOwner || session.role === "ADMIN")
    ? (role === "ADMIN" ? "ADMIN" : "STAFF")
    : "STAFF";

  const finalModules = intersectAllowed(
    Array.isArray(allowedModules) ? allowedModules : [],
    (company.enabledModules || []) as string[]
  );

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = await CompanyUser.create({
    companyId: session.companyId,
    email: String(email).toLowerCase().trim(),
    passwordHash,
    name: String(name).trim(),
    phone: String(phone || "").trim(),
    role: finalRole,
    allowedModules: finalModules,
    isActive: true,
    isOwner: false,
  });

  const safe = await CompanyUser.findById(user._id).select("-passwordHash").lean();
  return NextResponse.json({ user: safe }, { status: 201 });
}
