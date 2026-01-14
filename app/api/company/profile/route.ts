import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireCompanyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  await connectDB();

  const me = await CompanyUser.findById(session.userId).select("-passwordHash").lean();
  return NextResponse.json({ me });
}

export async function PATCH(req: NextRequest) {
  const session = await requireCompanyAuth(req);
  const body = await req.json();

  await connectDB();

  const me = await CompanyUser.findById(session.userId);
  if (!me) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // ✅ only owner can change owner email/password
  if (!me.isOwner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (body.email !== undefined) me.email = String(body.email).toLowerCase().trim();

  // ✅ password update (FIXED: trim + proper error)
  let changedPassword = false;
  if (body.password !== undefined) {
    const nextPass = String(body.password || "").trim();

    if (nextPass.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 chars" }, { status: 400 });
    }

    me.passwordHash = await bcrypt.hash(nextPass, 10);
    changedPassword = true;
  }

  await me.save();
  const safe = await CompanyUser.findById(me._id).select("-passwordHash").lean();

  return NextResponse.json({ me: safe, changedPassword });
}
