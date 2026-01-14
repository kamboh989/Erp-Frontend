import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id } = await ctx.params;

  const owner = await CompanyUser.findOne({ companyId: id, isOwner: true })
    .select("-passwordHash")
    .lean();

  const users = await CompanyUser.find({
    companyId: id,
    isOwner: { $ne: true },
  })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ owner, users });
}
