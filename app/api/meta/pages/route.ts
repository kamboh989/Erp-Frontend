import { NextRequest, NextResponse } from "next/server";
import { requireCompanyAuth, requireModule, authErrorResponse } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { listPages } from "@/lib/meta";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");

    const enc = req.cookies.get("meta_user_token_enc")?.value || "";
    if (!enc) return NextResponse.json({ error: "NO_META_TOKEN" }, { status: 401 });

    const userToken = decrypt(enc);
    const pages = await listPages(userToken);
    return NextResponse.json({ pages: pages?.data || [] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
