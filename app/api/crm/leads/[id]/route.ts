import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  requireCompanyAuth,
  requireModule,
  authErrorResponse,
} from "@/lib/auth";
import Lead from "@/models/Lead";
import CompanyUser from "@/models/CompanyUser";
import CrmSettings from "@/models/CrmSettings";

function isAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}
function isOwner(session: any) {
  return Boolean(session?.isOwner);
}

const ALLOWED_STATUS = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "CONVERTED",
  "LOST",
] as const;

const ALLOWED_FOLLOWUP = ["CALL", "MEETING", "WHATSAPP", "EMAIL"] as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const { id } = await ctx.params;

    // ✅ HARD DELETE FLOW: no isDeleted filter
    const lead = await Lead.findOne({
      _id: id,
      companyId: session.companyId,
    })
      .populate("assignedToIds", "name email role isActive")
      .lean();

    if (!lead) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // ✅ staff can view only if assigned
    if (!isAdmin(session)) {
      const ids = (lead as any).assignedToIds || [];
      const ok = ids.some(
        (u: any) => String(u?._id || u) === String(session.userId)
      );
      if (!ok) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const { id } = await ctx.params;
    const body = await req.json();

    // ✅ HARD DELETE FLOW: no isDeleted filter
    const lead = await Lead.findOne({
      _id: id,
      companyId: session.companyId,
    });
    if (!lead) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const admin = isAdmin(session);

    // ✅ staff can update only if assigned
    if (!admin) {
      const ok = (lead.assignedToIds || []).some(
        (x: any) => String(x) === String(session.userId)
      );
      if (!ok) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ✅ status update (staff allowed if assigned)
    if (body.status && ALLOWED_STATUS.includes(body.status)) {
      lead.status = body.status;
    }

    // ✅ multi-assign update (admin only)
    if (body.assignedToIds !== undefined) {
      if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

      const reqIds = Array.isArray(body.assignedToIds) ? body.assignedToIds : [];

      if (!reqIds.length) {
        lead.assignedToIds = [];
      } else {
        const activeUsers = await CompanyUser.find({
          _id: { $in: reqIds },
          companyId: session.companyId,
          isActive: true,
          isOwner: { $ne: true },
        })
          .select("_id")
          .lean();

        lead.assignedToIds = activeUsers.map((u) => u._id) as any;
      }
    }

    // ✅ follow-up update (staff allowed if assigned)
    if (body.followUp !== undefined) {
      const fu = body.followUp || {};

      // nextFollowUpAt
      if (fu.nextFollowUpAt) {
        const dt = new Date(fu.nextFollowUpAt);
        if (!isNaN(dt.getTime())) lead.nextFollowUpAt = dt;
      } else if (fu.nextFollowUpAt === null) {
        lead.nextFollowUpAt = null;
      }

      // followUpType
      if (fu.followUpType && ALLOWED_FOLLOWUP.includes(fu.followUpType)) {
        lead.followUpType = fu.followUpType;
      }

      // followUpNote
      if (fu.followUpNote !== undefined) {
        lead.followUpNote = String(fu.followUpNote || "");
      }

      // optional: if they set follow-up and status NEW, keep it in progress
      if (lead.nextFollowUpAt && lead.status === "NEW") {
        lead.status = "FOLLOW_UP";
      }
    }

    // ✅ add note/activity (staff allowed if assigned)
    if (body.addNote) {
      const note = String(body.addNote || "").trim();
      if (note) {
        lead.activities.push({
          type: "NOTE",
          note,
          byUserId: session.userId as any,
          createdAt: new Date(),
        } as any);

        lead.lastActivityAt = new Date();

        // auto move NEW → CONTACTED (from CRM settings)
        const settings = await CrmSettings.findOne({
          companyId: session.companyId,
        }).lean();

        const auto = settings?.autoMoveToContactedOnFirstActivity ?? true;
        if (auto && lead.status === "NEW") lead.status = "CONTACTED";
      }
    }

    await lead.save();

    const updated = await Lead.findById(lead._id)
      .populate("assignedToIds", "name email role isActive")
      .lean();

    return NextResponse.json({ lead: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// ✅ OWNER ONLY DELETE (PERMANENT DELETE)
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    // ✅ ONLY OWNER
    if (!isOwner(session)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await ctx.params;

    const deleted = await Lead.findOneAndDelete({
      _id: id,
      companyId: session.companyId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
