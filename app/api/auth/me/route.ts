import { NextResponse, type NextRequest } from "next/server";
import { readCompanyCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = readCompanyCookie(req);
  return NextResponse.json({ session });
}
