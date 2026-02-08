export async function metaGet(path: string, accessToken: string) {
  const url =
    `https://graph.facebook.com/v20.0${path}` +
    (path.includes("?") ? "&" : "?") +
    `access_token=${encodeURIComponent(accessToken)}`;

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Meta error ${r.status}`);
  return j;
}

export async function metaPost(path: string, accessToken: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: accessToken }).toString();
  const url = `https://graph.facebook.com/v20.0${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Meta error ${r.status}`);
  return j;
}

// 1) exchange code for short-lived user token
export async function exchangeCodeForToken(code: string) {
  const url = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  url.searchParams.set("client_id", process.env.META_APP_ID || "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET || "");
  url.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI || "");
  url.searchParams.set("code", code);

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Token exchange failed");
  return j as { access_token: string; token_type: string; expires_in: number };
}

// 2) exchange short-lived for long-lived user token
export async function makeLongLivedUserToken(shortUserToken: string) {
  const url = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.META_APP_ID || "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET || "");
  url.searchParams.set("fb_exchange_token", shortUserToken);

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Long-lived token failed");
  return j as { access_token: string; token_type: string; expires_in: number };
}

// 3) pages list with page tokens via /me/accounts
export async function listPages(userToken: string) {
  return metaGet(`/me/accounts?fields=id,name,access_token`, userToken);
}

// 4) list forms for a page
export async function listLeadForms(pageId: string, pageToken: string) {
  return metaGet(`/${pageId}/leadgen_forms?fields=id,name,status,created_time`, pageToken);
}

// 5) fetch lead details from leadgen_id
export async function fetchLeadgen(leadgenId: string, pageToken: string) {
  return metaGet(`/${leadgenId}?fields=created_time,field_data`, pageToken);
}


// 6) subscribe page to send leadgen webhooks to your app
export async function subscribeLeadgenWebhook(pageId: string, pageToken: string) {
  return metaPost(`/${pageId}/subscribed_apps`, pageToken, {
    subscribed_fields: "leadgen",
  });
}