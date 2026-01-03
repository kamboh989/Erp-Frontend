import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Company from "@/models/company";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  await connectDB();
  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  requireRole(session as any, ["SUPER_ADMIN"]);

  const { name, enabledModules = [] } = await req.json();

  await connectDB();
  const company = await Company.create({ name, enabledModules });

  return NextResponse.json({ company }, { status: 201 });
}
