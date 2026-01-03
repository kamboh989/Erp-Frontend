import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

export type SessionUser = {
  id: string;
  role: string;
  companyId: string | null;
  permissions: string[];
  allowedModules: string[];
  email: string;
};

const COOKIE_NAME = "erp_token";

export function setAuthCookie(res: NextResponse, payload: SessionUser) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function readAuthCookieFromReq(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  const session = readAuthCookieFromReq(req);
  if (!session) throw new Error("UNAUTHORIZED");

  await connectDB();
  const user = await User.findById(session.id).select("isActive").lean();
  if (!user?.isActive) throw new Error("UNAUTHORIZED");

  return session;
}
