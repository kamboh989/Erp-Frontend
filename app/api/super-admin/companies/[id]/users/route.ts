import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id } = await ctx.params; // ✅ Next 15 fix

  const users = await CompanyUser.find({ companyId: id })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}

