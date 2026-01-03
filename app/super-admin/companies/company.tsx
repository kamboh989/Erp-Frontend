"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePicker from "@/app/components/module-picker";
import type { AppModule } from "@/types/modules";

type Company = {
  _id: string;
  name: string;
  enabledModules: AppModule[];
  createdAt?: string;
};

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl";
const btnPrimary =
  "rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold";
const btnGhost =
  "rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm";
const btnDanger =
  "rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [name, setName] = useState("");
  const [enabledModules, setEnabledModules] = useState<AppModule[]>(["DASHBOARD"]);

  // edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/super-admin/companies", { cache: "no-store" });
    const j = await r.json();
    setCompanies(j.companies || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCompany() {
    if (!name.trim()) return alert("Company name required");

    const r = await fetch("/api/super-admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), enabledModules }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to create company");

    setName("");
    setEnabledModules(["DASHBOARD"]);
    await load();
  }

  function openEdit(c: Company) {
    setEditCompany({ ...c, enabledModules: c.enabledModules || [] });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCompany) return;

    const r = await fetch(`/api/super-admin/companies/${editCompany._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editCompany.name,
        enabledModules: editCompany.enabledModules,
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to update");

    setEditOpen(false);
    setEditCompany(null);
    await load();
  }

  async function deleteCompany(id: string) {
    const ok = confirm("Delete this company? (Users of this company will also be deleted)");
    if (!ok) return;

    const r = await fetch(`/api/super-admin/companies/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to delete");

    await load();
  }

  const sorted = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Companies</h1>
          <div className="text-sm text-white/60">Super Admin Panel</div>
        </div>

        {/* Create */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create Company</h2>
            <button className={btnPrimary} onClick={createCompany}>
              Create
            </button>
          </div>

          <div className="grid gap-3">
            <label className="text-sm text-white/70">Company Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Traders"
              className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
            />

            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Enabled Modules (Company Subscription)</div>
              <ModulePicker value={enabledModules} onChange={setEnabledModules} />
            </div>
          </div>
        </div>

        {/* List */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Companies</h2>
            <button className={btnGhost} onClick={load}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-white/60">Loading...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Enabled Modules</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((c) => (
                    <tr key={c._id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 font-semibold">{c.name}</td>
                      <td className="py-3 text-white/70">
                        {(c.enabledModules || []).join(", ")}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button className={btnGhost} onClick={() => openEdit(c)}>
                            Edit
                          </button>
                          <button className={btnDanger} onClick={() => deleteCompany(c._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={3}>
                        No companies found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editOpen && editCompany && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0B0F19] p-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Edit Company</div>
                <button className={btnGhost} onClick={() => setEditOpen(false)}>
                  Close
                </button>
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-white/70">Company Name</label>
                <input
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
                />

                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Enabled Modules</div>
                  <ModulePicker
                    value={editCompany.enabledModules}
                    onChange={(mods) => setEditCompany({ ...editCompany, enabledModules: mods })}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button className={btnGhost} onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button className={btnPrimary} onClick={saveEdit}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
