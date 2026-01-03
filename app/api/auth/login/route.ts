import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() }).lean();


  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const res = NextResponse.json({ ok: true });

  setAuthCookie(res, {
    id: String(user._id),
    role: user.role,
    companyId: user.companyId ? String(user.companyId) : null,
    permissions: user.permissions || [],
    allowedModules: user.allowedModules || [],
    email: user.email,
  });

  return res;
}
