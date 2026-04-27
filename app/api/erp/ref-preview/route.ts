import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { peekRefNo } from "@/lib/refNo";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const key = (url.searchParams.get("key") || "").trim().toUpperCase();
    const prefix = (url.searchParams.get("prefix") || key).trim().toUpperCase();

    if (!key) return NextResponse.json({ error: "KEY_REQUIRED" }, { status: 400 });

    const ref = await peekRefNo(session.companyId, key, prefix);

    return NextResponse.json({ ref }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
