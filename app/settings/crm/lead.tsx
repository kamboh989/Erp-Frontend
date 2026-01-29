"use client";

import { useEffect, useMemo, useState } from "react";

const shell = "max-w-6xl mx-auto p-6";
const panel =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg";
const btn =
  "rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-indigo-500 hover:from-blue-600 hover:to-indigo-400 transition";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";
const toggle =
  "inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm";

type User = { _id: string; name?: string; email: string };

export default function CrmSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState<User[]>([]);

  const [defaultLeadStatus, setDefaultLeadStatus] = useState("NEW");
  const [metaDefaultOwnerId, setMetaDefaultOwnerId] = useState<string>("");
  const [metaAssignmentMode, setMetaAssignmentMode] = useState<"DEFAULT_OWNER" | "UNASSIGNED">("DEFAULT_OWNER");
  const [autoMove, setAutoMove] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" }).then(r => r.json());
      const s = me?.session;
      setIsAdmin(Boolean(s?.isOwner) || s?.role === "ADMIN");

      const [sRes, uRes] = await Promise.all([
        fetch("/api/settings/crm", { cache: "no-store", credentials: "include" }),
        fetch("/api/company/users/active", { cache: "no-store", credentials: "include" }),
      ]);

      const sj = await sRes.json();
      const uj = await uRes.json();

      const st = sj?.settings || {};
      setDefaultLeadStatus(st.defaultLeadStatus || "NEW");
      setMetaDefaultOwnerId(st.metaDefaultOwnerId || "");
      setMetaAssignmentMode(st.metaAssignmentMode === "UNASSIGNED" ? "UNASSIGNED" : "DEFAULT_OWNER");
      setAutoMove(st.autoMoveToContactedOnFirstActivity ?? true);

      setUsers(uj?.users || []);
      setLoading(false);
    })();
  }, []);

  const canEdit = useMemo(() => isAdmin, [isAdmin]);

  async function save() {
    if (!canEdit) return alert("Admin only");
    setSaving(true);

    const r = await fetch("/api/settings/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        defaultLeadStatus,
        metaDefaultOwnerId: metaDefaultOwnerId || null,
        metaAssignmentMode,
        autoMoveToContactedOnFirstActivity: autoMove,
      }),
    });

    const j = await r.json();
    setSaving(false);

    if (!r.ok) return alert(j?.error || "Save failed");
    alert("Saved ✅");
  }

  if (loading) return <div className={shell}>Loading...</div>;

  return (
    <div className={shell}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">CRM Settings</div>
          <div className="text-gray-500 text-sm">Defaults for manual + Meta leads</div>
        </div>
        <button className={btn} onClick={save} disabled={!canEdit || saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className={panel}>
          <div className="text-sm font-semibold text-gray-900 mb-3">Defaults</div>

          <label className="text-sm text-gray-600">Default Lead Status</label>
          <select className={input} value={defaultLeadStatus} onChange={(e) => setDefaultLeadStatus(e.target.value)}>
            <option value="NEW">NEW</option>
          </select>

          <div className="h-4" />

          <div className="text-sm font-semibold text-gray-900 mb-2">Meta Leads Assignment</div>

          <label className="text-sm text-gray-600">Mode</label>
          <select className={input} value={metaAssignmentMode} onChange={(e) => setMetaAssignmentMode(e.target.value as any)}>
            <option value="DEFAULT_OWNER">Default Owner</option>
            <option value="UNASSIGNED">Unassigned Queue</option>
          </select>

          <div className="h-3" />

          <label className="text-sm text-gray-600">Default Owner (Staff)</label>
          <select
            className={input}
            value={metaDefaultOwnerId}
            onChange={(e) => setMetaDefaultOwnerId(e.target.value)}
            disabled={metaAssignmentMode === "UNASSIGNED"}
          >
            <option value="">— None —</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {(u.name || u.email)}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-xl border border-black/10 bg-gradient-to-r from-blue-600/10 to-indigo-500/10 p-3 text-sm text-gray-700">
            Meta lead aaye → status NEW + assigned according to settings.
          </div>
        </div>

        <div className={panel}>
          <div className="text-sm font-semibold text-gray-900 mb-3">Automation</div>

          <div className={toggle}>
            <input
              type="checkbox"
              checked={autoMove}
              onChange={() => setAutoMove((p) => !p)}
              disabled={!canEdit}
            />
            <span className="text-gray-800">Auto move NEW → CONTACTED on first note/activity</span>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            This keeps “New Leads” clean. First action happens → lead becomes In Progress.
          </div>

          {!canEdit && (
            <div className="mt-4 text-sm text-red-600">
              You are not admin. Settings are read-only.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
