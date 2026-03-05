"use client";

import { useEffect, useRef, useState } from "react";

type Row = { _id: string; name: string; isDefault?: boolean };

export default function LocationsSettingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // permissions (simple: try create endpoint? but better: use purchases can admin or create a small /api/me - not available)
  // For now UI allows actions but API will enforce RBAC.
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/locations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditRow(null);
    setName("");
    setIsDefault(false);
    setErr("");
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEditRow(r);
    setName(r.name || "");
    setIsDefault(Boolean(r.isDefault));
    setErr("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setErr("");

    const payload = { name: name.trim(), isDefault: Boolean(isDefault) };
    if (!payload.name) {
      setErr("Name required");
      setSaving(false);
      return;
    }

    const url = editRow?._id ? `/api/erp/locations/${editRow._id}` : "/api/erp/locations";
    const method = editRow?._id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const map: any = {
        NO_MODULE_ACCESS: "Not allowed",
        FORBIDDEN: "Not allowed",
        NAME_REQUIRED: "Name required",
        LOCATION_EXISTS: "Location already exists",
      };
      setErr(map[data?.error] || data?.error || "Failed");
      setSaving(false);
      return;
    }

    setOpen(false);
    setEditRow(null);
    await load();
    setSaving(false);
  }

  async function disable(id: string) {
    if (!confirm("Disable this location?")) return;
    const res = await fetch(`/api/erp/locations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");
    load();
  }

  return (
    <div className="p-6 w-full">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Locations</div>
            <div className="text-sm text-slate-500">Manage warehouses / business locations</div>
          </div>

          <button className={primaryBtn} onClick={openAdd}>
            + Add
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Default</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>Loading...</td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      {r.isDefault ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                          Default
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className={pillBtn} onClick={() => openEdit(r)}>Edit</button>
                        <button className="text-sm border border-rose-200 bg-rose-50 text-rose-700 rounded-xl px-3 py-2 hover:bg-rose-100" onClick={() => disable(r._id)}>
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>No locations</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
               onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">{editRow?._id ? "Edit Location" : "Add Location"}</div>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => setOpen(false)}>✕</button>
              </div>

              <div className="p-5 space-y-3">
                {err ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
                ) : null}

                <div>
                  <div className="text-xs mb-1 text-slate-500">Name *</div>
                  <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Warehouse" />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                  />
                  Make Default
                </label>

                <div className="text-xs text-slate-500">
                  Default location is auto-selected in Purchase Add form.
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button className={pillBtn} onClick={() => setOpen(false)}>Cancel</button>
                <button className={primaryBtn} disabled={saving} onClick={save}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}