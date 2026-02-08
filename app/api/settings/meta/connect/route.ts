import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireModule } from "@/lib/auth";
import MetaIntegration from "@/models/MetaIntegration";
import { encrypt } from "@/lib/crypto";
import { subscribeLeadgenWebhook } from "@/lib/meta";

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");
    await connectDB();

    const body = await req.json();

    const pageId = String(body.pageId || "").trim();
    const pageName = String(body.pageName || "").trim();
    const pageAccessToken = String(body.pageAccessToken || "").trim();
    const formIds = Array.isArray(body.formIds) ? body.formIds.map(String) : [];

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: "pageId/pageAccessToken required" },
        { status: 400 }
      );
    }

    

    const companyId = new mongoose.Types.ObjectId(String(session.companyId));

const integration = await MetaIntegration.findOneAndUpdate(
  { companyId, pageId },
  {
    companyId,
    pageId,
    pageName,
    pageAccessTokenEnc: encrypt(pageAccessToken),
    formIds,
    isActive: true,
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
).lean();

// ✅ IMPORTANT: subscribe page to leadgen webhooks
await subscribeLeadgenWebhook(pageId, pageAccessToken);

return NextResponse.json({ integration });

  
  } catch (err: any) {
    console.error("POST /api/settings/meta/connect error:", err);
    return NextResponse.json(
      { error: "META_SAVE_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}