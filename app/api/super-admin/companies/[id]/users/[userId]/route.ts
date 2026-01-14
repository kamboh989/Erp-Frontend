import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireSuperAdmin } from "@/lib/superAuth";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  await requireSuperAdmin(req);
  await connectDB();

  const { id, userId } = await ctx.params;
  const { isActive } = await req.json();

  const update: any = {};

  if (isActive !== undefined) {
    const nextActive = Boolean(isActive);
    update.isActive = nextActive;

    // ✅ super-admin deactivate => lock
    if (nextActive === false) update.lockedBySuper = true;

    // ✅ super-admin activate => unlock
    if (nextActive === true) update.lockedBySuper = false;
  }

  const user = await CompanyUser.findOneAndUpdate(
    { _id: userId, companyId: id, isOwner: { $ne: true } },
    update,
    { new: true }
  )
    .select("-passwordHash")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}
