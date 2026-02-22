import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule } from "@/lib/auth";
import Lead from "@/models/Lead";
import CompanyUser from "@/models/CompanyUser";

function isAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}

/* ---------------- GET ---------------- */
export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const q: any = {
      companyId: session.companyId,
      isDeleted: false,
    };

    // ✅ FIX: assignedToIds is ARRAY so use $in
    if (!isAdmin(session)) {
      q.assignedToIds = { $in: [session.userId] };
    }

    const leads = await Lead.find(q)
      .populate("assignedToIds", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error("GET /api/crm/leads error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */
export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const body = await req.json();
    const admin = isAdmin(session);

    const name = String(body.name || "").trim() || "Unknown";
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const businessName = String(body.businessName || "").trim();

    if (!phone && !email) {
      return NextResponse.json(
        { error: "PHONE_OR_EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    // ✅ NEW: block duplicates (same phone OR same email) within company
    const or: any[] = [];
    if (phone) or.push({ phone });
    if (email) or.push({ email });

    if (or.length) {
      const exists = await Lead.findOne({
        companyId: session.companyId,
        isDeleted: false,
        $or: or,
      })
        .select("_id leadId7 name phone email")
        .lean();

      if (exists) {
        return NextResponse.json(
          {
            error: "DUPLICATE_LEAD",
            message: "This lead already exists (same phone or email).",
            existing: exists,
          },
          { status: 409 }
        );
      }
    }

    let assignedToIds: any[] = [];

    // ✅ Admin can assign multiple users (but must be valid and active)
    if (admin && Array.isArray(body.assignedToIds) && body.assignedToIds.length) {
      const users = await CompanyUser.find({
        _id: { $in: body.assignedToIds },
        companyId: session.companyId,
        isActive: true,
      }).select("_id");

      // ✅ fallback if none valid
      assignedToIds = users.length ? users.map((u) => u._id) : [session.userId];
    } else {
      assignedToIds = [session.userId];
    }

    // ✅ IMPORTANT: MANUAL lead → no meta at all
    const lead = await Lead.create({
      companyId: session.companyId,
      name,
      phone,
      email,
      businessName,

      source: "MANUAL",
      status: "NEW",

      assignedToIds,

      // ✅ safety (ensure no meta saved for manual)
      meta: undefined,

      createdBy: "USER",
      createdByUserId: session.userId,
    });

    const populated = await Lead.findById(lead._id)
      .populate("assignedToIds", "name email")
      .lean();

    return NextResponse.json({ lead: populated }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/crm/leads error:", err);

    // ✅ NEW: helpful duplicate response (from unique indexes)
    if (err?.code === 11000) {
      return NextResponse.json(
        {
          error: "DUPLICATE_LEAD",
          message: "This lead already exists (same phone or email).",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}