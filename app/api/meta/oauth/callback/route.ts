import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, makeLongLivedUserToken } from "@/lib/meta";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";

  const cookieState = req.cookies.get("meta_oauth_state")?.value || "";
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings/crm/meta?error=oauth_state`);
  }

  const shortTok = await exchangeCodeForToken(code);
  const longTok = await makeLongLivedUserToken(shortTok.access_token);

  // store encrypted user token for short time (10 min)
  const res = NextResponse.redirect(`${process.env.APP_URL}/settings/crm/meta?connected=1`);
  res.cookies.set("meta_user_token_enc", encrypt(longTok.access_token), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
