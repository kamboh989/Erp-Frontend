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

const ALLOWED_STATUS = ["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "CONVERTED", "LOST"] as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ✅ params can be Promise
) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const { id } = await ctx.params; // ✅ unwrap
    const lead = await Lead.findOne({ _id: id, companyId: session.companyId })
      .populate("assignedTo", "name email role isActive")
      .lean();

    if (!lead) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (!isAdmin(session)) {
      const ownerId = String((lead as any).assignedTo?._id || "");
      if (ownerId !== String(session.userId)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    return NextResponse.json({ lead });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ✅ params can be Promise
) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const { id } = await ctx.params; // ✅ unwrap
    const body = await req.json();

    const lead = await Lead.findOne({ _id: id, companyId: session.companyId });
    if (!lead) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const admin = isAdmin(session);
    if (!admin && String(lead.assignedTo || "") !== String(session.userId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ✅ status update
    if (body.status && ALLOWED_STATUS.includes(body.status)) {
      lead.status = body.status;
    }

    // ✅ assign update (admin only)
    if (body.assignedTo !== undefined) {
      if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

      if (!body.assignedTo) {
        lead.assignedTo = null;
      } else {
        const u = await CompanyUser.findOne({
          _id: body.assignedTo,
          companyId: session.companyId,
          isActive: true,
          isOwner: { $ne: true },
        })
          .select("_id")
          .lean();

        lead.assignedTo = (u?._id as any) || null;
      }
    }

    // ✅ add note/activity + optional auto move
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

        const settings = await CrmSettings.findOne({ companyId: session.companyId }).lean();
        const auto = settings?.autoMoveToContactedOnFirstActivity ?? true;

        if (auto && lead.status === "NEW") {
          lead.status = "CONTACTED";
        }
      }
    }

    await lead.save();

    const updated = await Lead.findById(lead._id)
      .populate("assignedTo", "name email role isActive")
      .lean();

    return NextResponse.json({ lead: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}
