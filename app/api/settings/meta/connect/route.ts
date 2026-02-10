import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  requireCompanyAuth,
  requireModule,
  requireSetting,
  authErrorResponse,
} from "@/lib/auth";
import MetaIntegration from "@/models/MetaIntegration";
import { encrypt } from "@/lib/crypto";
import { subscribeLeadgenWebhook } from "@/lib/meta";

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);

    // ✅ module gate (global)
    requireModule(session, "SETTINGS");

    // ✅ setting-level gate (Meta settings card/page)
    requireSetting(session, "SETTINGS_META");

    await connectDB();

    const body = await req.json();

    const pageId = String(body.pageId || "").trim();
    const pageName = String(body.pageName || "").trim();
    const pageAccessToken = String(body.pageAccessToken || "").trim();
    const formIds = Array.isArray(body.formIds) ? body.formIds.map(String) : [];

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: "pageId/pageAccessToken required" },
        { status: 400 },
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
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    // ✅ IMPORTANT: subscribe page to leadgen webhooks
    await subscribeLeadgenWebhook(pageId, pageAccessToken);

    return NextResponse.json({ integration });
  } catch (err: any) {
    // ✅ keep your current meta error shape (client friendly)
    console.error("POST /api/settings/meta/connect error:", err);

    // If it's our AuthError -> return standard authErrorResponse
    // (so UI gets proper 401/403 instead of always 500)
    const maybeAuth = authErrorResponse(err);
    if (maybeAuth?.status === 401 || maybeAuth?.status === 403) return maybeAuth;

    return NextResponse.json(
      { error: "META_SAVE_FAILED", message: err?.message || String(err) },
      { status: 500 },
    );
  }
}