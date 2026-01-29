"use client";

import { useEffect, useState } from "react";

const shell = "max-w-6xl mx-auto p-6";
const panel =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg";
const btn =
  "rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-black to-blue-700 hover:from-zinc-900 hover:to-blue-600 transition";
const btnGhost =
  "rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

export default function MetaIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [pageId, setPageId] = useState("");
  const [formIds, setFormIds] = useState(""); // comma separated
  const [defaultOwnerId, setDefaultOwnerId] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" }).then(r => r.json());
      const s = me?.session;
      setIsAdmin(Boolean(s?.isOwner) || s?.role === "ADMIN");

      const r = await fetch("/api/settings/integrations/meta", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      const meta = j?.meta || {};
      setIsConnected(Boolean(meta.isConnected));
      setPageId(meta.pageId || "");
      setDefaultOwnerId(meta.defaultOwnerId || "");
      setFormIds(Array.isArray(meta.formIds) ? meta.formIds.join(",") : "");
      setLoading(false);
    })();
  }, []);

  async function connect() {
    if (!isAdmin) return alert("Admin only");
    const r = await fetch("/api/settings/integrations/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        pageId: pageId.trim(),
        formIds: formIds.split(",").map(s => s.trim()).filter(Boolean),
        defaultOwnerId: defaultOwnerId || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Failed");
    setIsConnected(true);
    alert("Connected ✅ (OAuth next step later)");
  }

  async function disconnect() {
    if (!isAdmin) return alert("Admin only");
    const r = await fetch("/api/settings/integrations/meta", { method: "DELETE", credentials: "include" });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Failed");
    setIsConnected(false);
    setPageId("");
    setFormIds("");
    setDefaultOwnerId("");
  }

  if (loading) return <div className={shell}>Loading...</div>;

  return (
    <div className={shell}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">Meta Lead Ads</div>
          <div className="text-gray-500 text-sm">Auto-create leads from Facebook/Instagram forms</div>
        </div>
        <div className="text-sm">
          Status:{" "}
          <span className={`font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}>
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
      </div>

      <div className={panel}>
        <div className="text-sm font-semibold text-gray-900 mb-3">Connection</div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Page ID (temporary)</label>
            <input className={input} value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="e.g. 123456789" />
            <div className="text-xs text-gray-500 mt-1">
              Abhi temporary connect state. Later OAuth se auto fill hoga.
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">Form IDs (comma separated)</label>
            <input className={input} value={formIds} onChange={(e) => setFormIds(e.target.value)} placeholder="form1, form2" />
          </div>
        </div>

        <div className="h-4" />

        <label className="text-sm text-gray-600">Default Owner ID (optional)</label>
        <input className={input} value={defaultOwnerId} onChange={(e) => setDefaultOwnerId(e.target.value)} placeholder="userId (optional)" />

        <div className="mt-4 flex gap-2">
          {!isConnected ? (
            <button className={btn} onClick={connect} disabled={!isAdmin}>
              Connect Meta Leads
            </button>
          ) : (
            <button className={btnGhost} onClick={disconnect} disabled={!isAdmin}>
              Disconnect
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="mt-4 text-sm text-red-600">
            Staff cannot connect integrations. Ask admin.
          </div>
        )}
      </div>
    </div>
  );
}
