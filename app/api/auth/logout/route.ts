import { NextResponse } from "next/server";
import { clearCompanyCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCompanyCookie(res);
  return res;
}
