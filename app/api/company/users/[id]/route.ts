import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireCompanyAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireCompanyAuth(req);
  const { isActive, allowedModules, name } = await req.json();

  await connectDB();

  const user = await CompanyUser.findOneAndUpdate(
    { _id: params.id, companyId: session.companyId, isOwner: { $ne: true } },
    {
      ...(name !== undefined ? { name } : {}),
      ...(allowedModules !== undefined ? { allowedModules } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    { new: true }
  ).select("-passwordHash").lean();

  return NextResponse.json({ user });
}
