import { NextRequest, NextResponse } from "next/server";
import { requireCompanyAuth, requireModule } from "@/lib/auth";
import { listLeadForms } from "@/lib/meta";

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    requireModule(session, "SETTINGS");

    const body = await req.json();
    const pageId = String(body.pageId || "").trim();
    const pageToken = String(body.pageToken || "").trim();

    if (!pageId || !pageToken) {
      return NextResponse.json(
        { error: "pageId/pageToken required" },
        { status: 400 }
      );
    }

    const forms = await listLeadForms(pageId, pageToken);
    return NextResponse.json({ forms: forms?.data || [] });
  } catch (err: any) {
    // ✅ return real message so you can see Meta permission errors
    console.error("POST /api/meta/forms error:", err?.message || err);
    return NextResponse.json(
      { error: "META_FORMS_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}