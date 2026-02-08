import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID!;
  const redirectUri = process.env.META_REDIRECT_URI!;
  const base = "https://www.facebook.com/v20.0/dialog/oauth";

  const scope = [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "leads_retrieval",
    "pages_manage_ads",
  ].join(",");

  const state = cryptoRandom();

  const url = new URL(base);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  // 🔴 🔴 🔴 YAHAN YE 2 LINES ADD KARO 🔴 🔴 🔴
  url.searchParams.set("auth_type", "rerequest");
  url.searchParams.set("prompt", "consent");

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}