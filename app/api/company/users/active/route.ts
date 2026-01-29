import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const users = await CompanyUser.find({
      companyId: session.companyId,
      isOwner: { $ne: true },
      isActive: true,
    })
      .select("_id name email role isActive")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err) {
    return authErrorResponse(err);
  }
}
