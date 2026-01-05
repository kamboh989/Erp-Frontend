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

export type CompanySession = {
  userId: string;
  companyId: string;
  email: string;
  allowedModules: string[];
};

export type AuthErrorCode =
  | "UNAUTHORIZED"
  | "PLAN_EXPIRED"
  | "NO_MODULE_ACCESS";

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;

  constructor(code: AuthErrorCode, status: number, message?: string) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

/** ✅ Set company session cookie */
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

/** ✅ Clear company session cookie */
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

/** ✅ Read session from request cookie */
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

/** ✅ For pages/layouts: returns session or null (no throw) */
export function getCompanySessionOrNull(req: NextRequest) {
  return readCompanyCookie(req);
}

/** ✅ Require auth + validate company/user/plan (throws AuthError) */
export async function requireCompanyAuth(req: NextRequest) {
  const session = readCompanyCookie(req);
  if (!session) throw new AuthError("UNAUTHORIZED", 401);

  await connectDB();

  const company = await Company.findById(session.companyId)
    .select("isActive planExpiresAt")
    .lean();

  if (!company?.isActive) throw new AuthError("UNAUTHORIZED", 401);

  const expired =
    company.planExpiresAt &&
    new Date(company.planExpiresAt).getTime() < Date.now();

  if (expired) throw new AuthError("PLAN_EXPIRED", 403, "Plan expired");

  const user = await CompanyUser.findById(session.userId)
    .select("isActive companyId")
    .lean();

  // user missing / inactive
  if (!user?.isActive) throw new AuthError("UNAUTHORIZED", 401);

  // extra safety: ensure user belongs to same company
  if (String(user.companyId) !== String(session.companyId)) {
    throw new AuthError("UNAUTHORIZED", 401);
  }

  return session;
}

/** ✅ Require module access for a route/page (throws AuthError) */
export function requireModule(session: CompanySession, moduleKey: string) {
  if (!session.allowedModules?.includes(moduleKey)) {
    throw new AuthError("NO_MODULE_ACCESS", 403, "No module access");
  }
}

/** ✅ Helper: convert AuthError to response (use in route.ts catch) */
export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
}
