import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  requireCompanyAuth,
  requireCompanyAdmin,
  requireModule,
  requireSetting,
  authErrorResponse,
} from "@/lib/auth";
import CrmSettings from "@/models/CrmSettings";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);

    // ✅ module gate (global)
    requireModule(session, "SETTINGS");

    // ✅ setting-level gate (CRM settings card/page)
    requireSetting(session, "SETTINGS_CRM");

    await connectDB();

    const s = await CrmSettings.findOne({ companyId: session.companyId }).lean();

    return NextResponse.json({
      settings: s || {
        defaultLeadStatus: "NEW",
        metaDefaultOwnerId: null,
        autoMoveToContactedOnFirstActivity: true,
        metaAssignmentMode: "DEFAULT_OWNER",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);

    // ✅ module gate (global)
    requireModule(session, "SETTINGS");

    // ✅ setting-level gate (CRM settings card/page)
    requireSetting(session, "SETTINGS_CRM");

    // ✅ admin only for save
    requireCompanyAdmin(session);

    const body = await req.json();

    await connectDB();

    const next = await CrmSettings.findOneAndUpdate(
      { companyId: session.companyId },
      {
        $set: {
          defaultLeadStatus: body.defaultLeadStatus || "NEW",
          metaDefaultOwnerId: body.metaDefaultOwnerId || null,
          autoMoveToContactedOnFirstActivity: Boolean(
            body.autoMoveToContactedOnFirstActivity,
          ),
          metaAssignmentMode:
            body.metaAssignmentMode === "UNASSIGNED"
              ? "UNASSIGNED"
              : "DEFAULT_OWNER",
        },
      },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ settings: next });
  } catch (err) {
    return authErrorResponse(err);
  }
}