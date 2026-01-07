import { NextRequest, NextResponse } from "next/server";

function prompt() {
  const res = new NextResponse("Auth required", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Super Admin"');
  return res;
}

// OPTIONAL: route -> module mapping (manual URL block)
const MODULE_ROUTE_MAP: Array<{ prefix: string; module: string }> = [
  { prefix: "/crm/leads", module: "CRM_LEADS" },
  { prefix: "/crm/customers", module: "CRM_CUSTOMERS" },
  { prefix: "/crm/deals", module: "CRM_DEALS" },

  { prefix: "/erp/sales", module: "ERP_SALES" },
  { prefix: "/erp/inventory", module: "ERP_INVENTORY" },
  { prefix: "/erp/purchasing", module: "ERP_PURCHASING" },
  { prefix: "/erp/accounts", module: "ERP_ACCOUNTS" },

  { prefix: "/reports", module: "REPORTS" },
  { prefix: "/settings", module: "SETTINGS" },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ignore next internals/api
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // =========================
  // 1) SUPER ADMIN BASIC AUTH
  // =========================
  if (pathname.startsWith("/super-admin")) {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Basic ")) return prompt();

    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return prompt();

    const email = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);

    const envEmail = process.env.SEED_SUPER_EMAIL;
    const envPass = process.env.SEED_SUPER_PASS;

    if (!envEmail || !envPass) {
      return new NextResponse("Missing SEED_SUPER_EMAIL/SEED_SUPER_PASS in env", { status: 500 });
    }

    if (email !== envEmail || pass !== envPass) return prompt();

    return NextResponse.next();
  }

  // ==========================================
  // 2) CLIENT APP ROUTES (LIVE SESSION CHECK)
  // ==========================================
  const isProtectedApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/erp") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  if (!isProtectedApp) return NextResponse.next();

  // ✅ call /api/auth/me (DB-driven) with same cookies
  const meUrl = req.nextUrl.clone();
  meUrl.pathname = "/api/auth/me";
  meUrl.search = "";

  const meRes = await fetch(meUrl, {
    headers: { cookie: req.headers.get("cookie") || "" },
    cache: "no-store",
  });

  // if auth/me fails, kick to login
  if (!meRes.ok) {
    const login = req.nextUrl.clone();
    login.pathname = "/auth/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const me = await meRes.json();
  const session = me?.session;

  // no session => redirect login
  if (!session?.userId || !session?.companyId) {
    const login = req.nextUrl.clone();
    login.pathname = "/";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const allowed: string[] = session?.allowedModules || [];

  // dashboard always allowed
  if (pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // module check for other routes
  const match = MODULE_ROUTE_MAP.find((x) => pathname.startsWith(x.prefix));
  if (match && !allowed.includes(match.module)) {
    const deny = req.nextUrl.clone();
    deny.pathname = "/dashboard";
    deny.searchParams.set("error", "no_access");
    return NextResponse.redirect(deny);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/dashboard/:path*",
    "/crm/:path*",
    "/erp/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
