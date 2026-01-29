import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, requireModule, authErrorResponse } from "@/lib/auth";
import MetaIntegration from "@/models/MetaIntegration";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");
    await connectDB();

    const meta = await MetaIntegration.findOne({ companyId: session.companyId }).lean();
    return NextResponse.json({ meta: meta || { isConnected: false } });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/**
 * NOTE: Real Meta OAuth later. Abhi "mark connected" skeleton.
 * You can later replace this with real OAuth callback.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");
    requireCompanyAdmin(session);

    const body = await req.json(); // { pageId, formIds, defaultOwnerId }
    await connectDB();

    const meta = await MetaIntegration.findOneAndUpdate(
      { companyId: session.companyId },
      {
        $set: {
          isConnected: true,
          pageId: String(body.pageId || ""),
          formIds: Array.isArray(body.formIds) ? body.formIds.map(String) : [],
          defaultOwnerId: body.defaultOwnerId || null,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ meta });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");
    requireCompanyAdmin(session);

    await connectDB();
    await MetaIntegration.findOneAndUpdate(
      { companyId: session.companyId },
      { $set: { isConnected: false, pageId: "", formIds: [], accessToken: "", defaultOwnerId: null } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
