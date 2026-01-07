import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";

const COOKIE_NAME = "erp_token";

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET");
  return s;
}

export type CompanyRole = "ADMIN" | "STAFF";

export type CompanySession = {
  userId: string;
  companyId: string;
  email: string;
  name?: string;
  role: CompanyRole;
  isOwner: boolean;
  allowedModules: string[];
};

export type AuthErrorCode = "UNAUTHORIZED" | "NO_MODULE_ACCESS" | "FORBIDDEN";

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;
  constructor(code: AuthErrorCode, status: number, message?: string) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

export function setCompanyCookie(res: NextResponse, payload: CompanySession) {
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

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

export function clearCompanyCookie(res: NextResponse) {
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

export function readCompanyCookie(req: NextRequest): CompanySession | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret) as CompanySession;
  } catch {
    return null;
  }
}

/** ✅ Require auth + validate company/user */
export async function requireCompanyAuth(req: NextRequest) {
  const session = readCompanyCookie(req);
  if (!session) throw new AuthError("UNAUTHORIZED", 401);

  await connectDB();

  const company = await Company.findById(session.companyId)
    .select("isActive enabledModules")
    .lean();
  if (!company?.isActive) throw new AuthError("UNAUTHORIZED", 401);

  const user = await CompanyUser.findById(session.userId)
    .select("isActive companyId email name role isOwner allowedModules")
    .lean();

  if (!user?.isActive) throw new AuthError("UNAUTHORIZED", 401);
  if (String(user.companyId) !== String(session.companyId)) throw new AuthError("UNAUTHORIZED", 401);

  // ✅ FINAL allowed = user.allowedModules ∩ company.enabledModules
  const enabled = new Set<string>((company.enabledModules || []) as string[]);
  const finalAllowed = ((user.allowedModules || []) as string[]).filter((m) => enabled.has(m));

  // ✅ Return fresh session-like object (DB truth)
  return {
    userId: String(user._id),
    companyId: String(user.companyId),
    email: user.email,
    name: user.name || "",
    role: (user.role || "STAFF") as CompanyRole,
    isOwner: Boolean(user.isOwner),
    allowedModules: finalAllowed,
  } satisfies CompanySession;
}

export function requireModule(session: CompanySession, moduleKey: string) {
  if (!session.allowedModules?.includes(moduleKey)) {
    throw new AuthError("NO_MODULE_ACCESS", 403, "No module access");
  }
}

export function requireCompanyAdmin(session: CompanySession) {
  if (!(session.isOwner || session.role === "ADMIN")) {
    throw new AuthError("FORBIDDEN", 403, "Admin only");
  }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
}
