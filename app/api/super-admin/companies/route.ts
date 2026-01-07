import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

export async function GET(req: NextRequest) {
  await requireSuperAdmin(req);
  await connectDB();

  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  await requireSuperAdmin(req);

  const {
    companyName,
    businessName, // backward compatibility
    email,
    password,
    phone,
    enabledModules = [],
    maxUsers = 1,
  } = await req.json();

  const finalName = String(companyName || businessName || "").trim();

  if (!finalName || !email || !password) {
    return NextResponse.json(
      { error: "companyName/email/password required" },
      { status: 400 }
    );
  }

  await connectDB();

  const exists = await Company.findOne({ email: String(email).toLowerCase() }).lean();
  if (exists) {
    return NextResponse.json({ error: "Company email already exists" }, { status: 409 });
  }

  const company = await Company.create({
    companyName: finalName,
    email: String(email).toLowerCase(),
    phone: String(phone || "").trim(),
    enabledModules,
    maxUsers: Number(maxUsers),
    isActive: true,
  });

  const passwordHash = await bcrypt.hash(String(password), 10);

  await CompanyUser.create({
    companyId: company._id,
    email: String(email).toLowerCase(),
    passwordHash,
    name: "Company Owner",
    isOwner: true,
    isActive: true,
    allowedModules: enabledModules,
  });

  return NextResponse.json({ company }, { status: 201 });
}
