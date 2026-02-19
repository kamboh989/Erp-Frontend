import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule } from "@/lib/auth";
import Lead from "@/models/Lead";

function isAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}

const ALLOWED_STATUS = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "CONVERTED",
  "LOST",
] as const;

/**
 * GET /api/crm/followups?q=&status=
 * - q: search by name or leadId7
 * - status: ALL | allowed status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const qText = String(searchParams.get("q") || "").trim();
    const status = String(searchParams.get("status") || "ALL").trim();

    const q: any = {
      companyId: session.companyId,
      isDeleted: false,

      // ✅ Follow-ups page: only leads with nextFollowUpAt
      nextFollowUpAt: { $ne: null },
    };

    // ✅ staff: only assigned leads
    if (!isAdmin(session)) {
      q.assignedToIds = { $in: [session.userId] };
    }

    // ✅ status filter
    if (status !== "ALL" && (ALLOWED_STATUS as readonly string[]).includes(status)) {
      q.status = status;
    }

    // ✅ search by name OR leadId7
    if (qText) {
      const safe = qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex
      q.$or = [
        { name: { $regex: safe, $options: "i" } },
        { leadId7: { $regex: safe, $options: "i" } },
      ];
    }

    const leads = await Lead.find(q)
      .populate("assignedToIds", "name email")
      .sort({ nextFollowUpAt: -1 }) // ✅ latest follow-up first
      .lean();

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error("GET /api/crm/followups error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
