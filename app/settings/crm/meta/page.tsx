"use client";

import { useEffect, useMemo, useState } from "react";

type PageItem = { id: string; name: string; access_token: string };
type FormItem = { id: string; name: string; status?: string };

const card = "rounded-2xl border border-black/10 bg-white p-5 shadow-sm";
const btn = "rounded-xl px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-700 to-indigo-500 text-white hover:shadow-lg transition";
const btnGhost = "rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition";
const input = "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

export default function MetaSettingsPage() {
  const [connected, setConnected] = useState(false);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [pageId, setPageId] = useState("");
  const selectedPage = useMemo(() => pages.find(p => p.id === pageId), [pages, pageId]);

  const [forms, setForms] = useState<FormItem[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);

  async function loadPages() {
    setLoadingPages(true);
    const r = await fetch("/api/meta/pages", { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setLoadingPages(false);
      return;
    }
    setPages(j.pages || []);
    setLoadingPages(false);
  }

  async function loadForms(pid: string, token: string) {
  setLoadingForms(true);

  const r = await fetch("/api/meta/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ pageId: pid, pageToken: token }),
  });

  const j = await r.json();
  if (!r.ok) {
    console.log("forms error:", j);
    alert(j?.message || j?.error || "Forms load failed");
    setLoadingForms(false);
    return;
  }

  setForms(j.forms || []);
  setLoadingForms(false);
}

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("connected") === "1") {
      setConnected(true);
      loadPages();
    }
  }, []);

  async function save() {
    if (!selectedPage) return alert("Select a page");
    const r = await fetch("/api/settings/meta/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        pageAccessToken: selectedPage.access_token,
        formIds: selectedForms,
      }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Save failed");
    alert("Meta connected ✅");
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className={card}>
        <div className="text-2xl font-bold text-gray-900">Meta Integration</div>
        <div className="text-sm text-gray-500 mt-1">
          Connect Facebook/Instagram lead forms and auto-create leads in CRM.
        </div>

        <div className="mt-4 flex gap-2">
          <a className={btn} href="/api/meta/oauth/start">
            Connect Meta
          </a>
          <button className={btnGhost} onClick={loadPages} disabled={!connected || loadingPages}>
            {loadingPages ? "Loading Pages..." : "Load Pages"}
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          After connect, select Page & Forms and Save.
        </div>
      </div>

      <div className={card}>
        <div className="text-lg font-semibold text-gray-900 mb-3">1) Select Page</div>

        <select
          className={input}
          value={pageId}
          onChange={async (e) => {
            const id = e.target.value;
            setPageId(id);
            setSelectedForms([]);
            setForms([]);
            const p = pages.find(x => x.id === id);
            if (p) await loadForms(p.id, p.access_token);
          }}
        >
          <option value="">Select a Page</option>
          {pages.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {loadingForms && <div className="text-sm text-gray-500 mt-2">Loading forms...</div>}
      </div>

      <div className={card}>
        <div className="text-lg font-semibold text-gray-900 mb-3">2) Select Forms</div>

        <div className="space-y-2">
          {forms.map(f => {
            const has = selectedForms.includes(f.id);
            return (
              <label key={f.id} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={has}
                  onChange={(e) => {
                    setSelectedForms(prev =>
                      e.target.checked
                        ? Array.from(new Set([...prev, f.id]))
                        : prev.filter(x => x !== f.id)
                    );
                  }}
                />
                <span>{f.name}</span>
                <span className="text-xs text-gray-500">{f.status || ""}</span>
              </label>
            );
          })}
          {forms.length === 0 && <div className="text-sm text-gray-500">No forms loaded yet.</div>}
        </div>

        <div className="mt-4 flex justify-end">
          <button className={btn} onClick={save} disabled={!selectedPage}>
            Save Integration
          </button>
        </div>
      </div>
    </div>
  );
}
