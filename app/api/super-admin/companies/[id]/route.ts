import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id } = await ctx.params;
  const body = await req.json();

  const company = await Company.findById(id);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  if (body.companyName !== undefined || body.businessName !== undefined) {
    const nextName = String(body.companyName ?? body.businessName).trim();
    company.companyName = nextName;
  }

  if (body.phone !== undefined) company.phone = String(body.phone).trim();
  if (body.maxUsers !== undefined) company.maxUsers = Number(body.maxUsers);
  if (body.isActive !== undefined) company.isActive = Boolean(body.isActive);

  // ✅ enabledModules update + sync to ALL users
  if (body.enabledModules !== undefined) {
    const mods = Array.isArray(body.enabledModules) ? body.enabledModules : [];
    company.enabledModules = mods;

    await CompanyUser.updateMany(
      { companyId: company._id },
      { $set: { allowedModules: mods } }
    );
  }

  // ✅ email update (unique) + update owner email
  if (body.email !== undefined) {
    const newEmail = String(body.email).toLowerCase().trim();
    const clash = await Company.findOne({ email: newEmail, _id: { $ne: company._id } }).lean();
    if (clash) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    company.email = newEmail;
    await CompanyUser.updateOne(
      { companyId: company._id, isOwner: true },
      { $set: { email: newEmail } }
    );
  }

  // ✅ password reset -> owner password update
  if (body.password !== undefined && String(body.password).length >= 4) {
    const passwordHash = await bcrypt.hash(String(body.password), 10);
    await CompanyUser.updateOne(
      { companyId: company._id, isOwner: true },
      { $set: { passwordHash } }
    );
  }

  await company.save();
  return NextResponse.json({ company: company.toObject() });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id } = await ctx.params;
  const { email, password } = await req.json();

  const company = await Company.findById(id).lean();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const owner = await CompanyUser.findOne({
    companyId: id,
    isOwner: true,
    email: String(email).toLowerCase(),
  }).lean();

  if (!owner) return NextResponse.json({ error: "Confirm email/password invalid" }, { status: 401 });

  const ok = await bcrypt.compare(String(password), owner.passwordHash);
  if (!ok) return NextResponse.json({ error: "Confirm email/password invalid" }, { status: 401 });

  await CompanyUser.deleteMany({ companyId: id });
  await Company.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
