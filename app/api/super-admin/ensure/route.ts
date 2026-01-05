import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SuperAdminSchema = new mongoose.Schema(
  { email: String, passwordHash: String, isActive: Boolean },
  { timestamps: true }
);
const SuperAdmin =
  mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);

export async function POST() {
  const email = process.env.SEED_SUPER_EMAIL;
  const pass = process.env.SEED_SUPER_PASS;
  if (!email || !pass) {
    return NextResponse.json({ error: "Missing env" }, { status: 500 });
  }

  await mongoose.connect(process.env.MONGODB_URI!);

  const exists = await SuperAdmin.findOne({ email: email.toLowerCase() }).lean();
  if (exists) return NextResponse.json({ ok: true, already: true });

  const passwordHash = await bcrypt.hash(pass, 10);
  await SuperAdmin.create({ email: email.toLowerCase(), passwordHash, isActive: true });

  return NextResponse.json({ ok: true, created: true });
}
