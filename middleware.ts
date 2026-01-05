import { NextRequest, NextResponse } from "next/server";

function prompt() {
  const res = new NextResponse("Auth required", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Super Admin"');
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // only protect /super-admin (and nested)
  if (!pathname.startsWith("/super-admin")) {
    return NextResponse.next();
  }

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
    return new NextResponse("Missing SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASS in env", { status: 500 });
  }

  if (email !== envEmail || pass !== envPass) return prompt();

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*"],
};
