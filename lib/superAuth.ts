import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import SuperAdmin from "@/models/SuperAdmin";

const SUPER_COOKIE = "super_admin_token";
const JWT_SECRET = process.env.JWT_SECRET!;

export type SuperSession = { id: string; email: string };

export function readSuperCookie(req: NextRequest): SuperSession | null {
  const token = req.cookies.get(SUPER_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SuperSession;
  } catch {
    return null;
  }
}

// ✅ now returns null instead of throwing
export async function requireSuperAdmin(req: NextRequest) {
  const session = readSuperCookie(req);
  if (!session) return null;

  await connectDB();
  const sa = await SuperAdmin.findById(session.id).select("isActive").lean();
  if (!sa?.isActive) return null;

  return session;
}
