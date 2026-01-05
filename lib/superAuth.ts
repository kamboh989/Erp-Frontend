import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SuperAdmin from "@/models/SuperAdmin";

const SUPER_COOKIE = "super_admin_token";
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

export type SuperSession = { id: string; email: string };

export function setSuperCookie(res: NextResponse, payload: SuperSession) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.cookies.set({
    name: SUPER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function readSuperCookie(req: NextRequest): SuperSession | null {
  const token = req.cookies.get(SUPER_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SuperSession;
  } catch {
    return null;
  }
}

export async function requireSuperAdmin(req: NextRequest) {
  const session = readSuperCookie(req);
  if (!session) throw new Error("SUPER_UNAUTHORIZED");

  await connectDB();
  const sa = await SuperAdmin.findById(session.id).select("isActive").lean();
  if (!sa?.isActive) throw new Error("SUPER_UNAUTHORIZED");

  return session;
}
