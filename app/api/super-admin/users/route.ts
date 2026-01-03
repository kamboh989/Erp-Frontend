import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import Company from "@/models/company";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).select("-passwordHash").lean();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  const {
    email,
    password,
    name,
    role = "COMPANY_ADMIN",
    companyId,
    allowedModules = [],
    isActive = true,
  } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "email/password required" }, { status: 400 });
  }
  if (role !== "SUPER_ADMIN" && !companyId) {
    return NextResponse.json({ error: "companyId required for non-super user" }, { status: 400 });
  }

  await connectDB();

  // ✅ Auto-enable modules in company (SUPER_ADMIN convenience)
  if (companyId) {
    const company = await Company.findById(companyId);
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const enabled = new Set(company.enabledModules || []);
    const incoming = new Set(allowedModules || []);
    let changed = false;

    for (const m of incoming) {
      if (!enabled.has(m)) {
        enabled.add(m);
        changed = true;
      }
    }

    if (changed) {
      company.enabledModules = Array.from(enabled);
      await company.save();
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    passwordHash,
    name,
    role,
    companyId: companyId || null,
    allowedModules,
    isActive,
  });

  return NextResponse.json({ user: { id: String(user._id), email: user.email } }, { status: 201 });
}

