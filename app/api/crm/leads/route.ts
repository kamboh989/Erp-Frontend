import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule, authErrorResponse } from "@/lib/auth";
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const q: any = { companyId: session.companyId };

    if (!isAdmin(session)) {
      q.assignedTo = session.userId;
    }

    if (status) q.status = status;

    const leads = await Lead.find(q)
      .populate("assignedTo", "name email role isActive")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ leads });
  } catch (err) {
    return authErrorResponse(err);
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
      return NextResponse.json({ error: "PHONE_OR_EMAIL_REQUIRED" }, { status: 400 });
    }

    // assign logic:
    let assignedTo: any = null;

    // staff can only assign to self
    if (!admin) {
      assignedTo = session.userId;
    } else {
      // admin can choose
      if (body.assignedTo) {
        const u = await CompanyUser.findOne({
          _id: body.assignedTo,
          companyId: session.companyId,
          isActive: true,
          isOwner: { $ne: true },
        }).select("_id").lean();

        assignedTo = u?._id || null;
      } else {
        assignedTo = null; // allow unassigned
      }
    }

    const lead = await Lead.create({
      companyId: session.companyId,
      name,
      phone,
      email,
      businessName,
      source: "MANUAL",
      status: "NEW",
      assignedTo,
      createdBy: "USER",
      createdByUserId: session.userId,
    });

    const populated = await Lead.findById(lead._id)
      .populate("assignedTo", "name email role isActive")
      .lean();

    return NextResponse.json({ lead: populated }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
