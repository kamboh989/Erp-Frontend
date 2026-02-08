import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import MetaIntegration from "@/models/MetaIntegration";
import Lead from "@/models/Lead";
import { decrypt } from "@/lib/crypto";
import { fetchLeadgen } from "@/lib/meta";

// GET verification
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// optional signature verify (recommended)
function verifySignature(req: NextRequest, rawBody: string) {
  const sig = req.headers.get("x-hub-signature-256"); // sha256=...
  if (!sig) return true;
  const secret = process.env.META_APP_SECRET || "";
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (!verifySignature(req, raw)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  try {
    await connectDB();

    const entries = payload?.entry || [];
    for (const e of entries) {
      const pageId = String(e?.id || "");
      const changes = e?.changes || [];

      // ✅ multi-tenant mapping by pageId
      const integration = await MetaIntegration.findOne({ pageId, isActive: true }).lean();
      if (!integration) continue;

      const pageToken = decrypt(integration.pageAccessTokenEnc);

      for (const ch of changes) {
        if (ch?.field !== "leadgen") continue;

        const leadgenId = String(ch?.value?.leadgen_id || "");
        const formId = String(ch?.value?.form_id || "");
        if (!leadgenId) continue;

        // if company selected forms, ignore others
        if ((integration.formIds || []).length > 0 && formId && !integration.formIds.includes(formId)) {
          continue;
        }

        // dedupe
        const exists = await Lead.findOne({
          companyId: integration.companyId,
          "meta.leadgenId": leadgenId,
        }).select("_id").lean();
        if (exists) continue;

        // fetch lead details
        const leadData = await fetchLeadgen(leadgenId, pageToken);
        const fieldData = leadData?.field_data || [];

        const map: Record<string, string> = {};
        for (const f of fieldData) {
          const key = String(f?.name || "").toLowerCase();
          const values = Array.isArray(f?.values) ? f.values : [];
          map[key] = String(values[0] || "");
        }

        const name = map["full_name"] || map["name"] || "Unknown";
        const email = map["email"] || "";
        const phone = map["phone_number"] || map["phone"] || "";
        const businessName = map["company_name"] || map["business_name"] || "";

        await Lead.create({
          companyId: integration.companyId,
          name,
          email,
          phone,
          businessName,
          source: "META",
          status: "NEW",
          assignedToIds: [],

          createdBy: "SYSTEM",

          meta: { pageId, formId, leadgenId },

          activities: [
            { type: "NOTE", note: "Meta lead received automatically", createdAt: new Date() },
          ],
          lastActivityAt: new Date(leadData?.created_time || Date.now()),
        });
      }
    }

    // Meta expects fast 200 response. :contentReference[oaicite:9]{index=9}
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("META WEBHOOK ERROR:", err?.message || err);
    // Return 200 to prevent aggressive retries
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
