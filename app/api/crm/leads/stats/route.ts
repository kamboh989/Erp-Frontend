import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule, authErrorResponse } from "@/lib/auth";
import Lead from "@/models/Lead";

function isAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const base: any = { companyId: session.companyId };
    if (!isAdmin(session)) base.assignedTo = session.userId;

    const [total, newLeads, converted] = await Promise.all([
      Lead.countDocuments(base),
      Lead.countDocuments({ ...base, status: "NEW" }),
      Lead.countDocuments({ ...base, status: "CONVERTED" }),
    ]);

    // In Progress = CONTACTED + FOLLOW_UP + INTERESTED
    const inProgress = await Lead.countDocuments({
      ...base,
      status: { $in: ["CONTACTED", "FOLLOW_UP", "INTERESTED"] },
    });

    return NextResponse.json({ total, newLeads, inProgress, converted });
  } catch (err) {
    return authErrorResponse(err);
  }
}
