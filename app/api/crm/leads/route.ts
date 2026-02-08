import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule } from "@/lib/auth";
import Lead from "@/models/Lead";
import CompanyUser from "@/models/CompanyUser";

function isAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "CRM_LEADS");
    await connectDB();

    const q: any = {
      companyId: session.companyId,
      isDeleted: false,
    };

    // staff sirf apni assigned leads dekhe
    if (!isAdmin(session)) {
      q.assignedToIds = session.userId;
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

    let assignedToIds: any[] = [];

    if (admin && Array.isArray(body.assignedToIds)) {
      const users = await CompanyUser.find({
        _id: { $in: body.assignedToIds },
        companyId: session.companyId,
        isActive: true,
      }).select("_id");

      assignedToIds = users.map((u) => u._id);
    } else {
      // staff / default → self assign
      assignedToIds = [session.userId];
    }

    const lead = await Lead.create({
      companyId: session.companyId,
      name,
      phone,
      email,
      businessName,

      source: "MANUAL",
      status: "NEW",

      assignedToIds,

      createdBy: "USER",
      createdByUserId: session.userId,
    });

    const populated = await Lead.findById(lead._id)
      .populate("assignedToIds", "name email")
      .lean();

    return NextResponse.json({ lead: populated }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/crm/leads error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
