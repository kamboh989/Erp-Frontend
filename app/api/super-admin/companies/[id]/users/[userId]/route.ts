import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id, userId } = await ctx.params; // ✅ Next 15 fix
  const { isActive } = await req.json();

  const user = await CompanyUser.findOneAndUpdate(
    { _id: userId, companyId: id, isOwner: { $ne: true } },
    { ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}) },
    { new: true }
  )
    .select("-passwordHash")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

