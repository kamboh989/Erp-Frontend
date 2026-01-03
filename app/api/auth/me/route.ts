import { NextResponse, type NextRequest } from "next/server";
import { readAuthCookieFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = readAuthCookieFromReq(req);
  return NextResponse.json({ session });
}
