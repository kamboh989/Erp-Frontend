import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();

    const filter: any = {
      companyId: session.companyId,
      isOwner: { $ne: true },
      isActive: true,
    };

    if (!session.isOwner) {
      filter.role = "STAFF";
      filter._id = { $ne: session.userId };
    }

    const users = await CompanyUser.find(filter)
      .select("_id name email role isActive")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err) {
    return authErrorResponse(err);
  }
}