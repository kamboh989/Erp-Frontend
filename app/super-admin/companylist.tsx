"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import ModulePicker from "@/app/components/module-picker";
import type { AppModule } from "@/types/modules";

type Company = {
  _id: string;
  businessName: string;
  email: string;
  phone?: string;
  planDays: number;
  planStartsAt: string;
  planExpiresAt: string;
  enabledModules: AppModule[];
  maxUsers: number;
  isActive: boolean;
  createdAt?: string;
};

type CompanyUser = {
  _id: string;
  email: string;
  name?: string;
  isOwner?: boolean;
  isActive?: boolean;
  allowedModules?: AppModule[];
  createdAt?: string;
};

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl";
const btnPrimary = "rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold";
const btnGhost = "rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm";
const btnDanger = "rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold";
const input = "rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500";

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [planDays, setPlanDays] = useState<number>(30);
  const [maxUsers, setMaxUsers] = useState<number>(3);
  const [enabledModules, setEnabledModules] = useState<AppModule[]>(["DASHBOARD"]);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editPassword, setEditPassword] = useState("");

  // expand company users
  const [openUsersFor, setOpenUsersFor] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // delete loading (avoid double click)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCompanies() {
    setLoading(true);
    const r = await fetch("/api/super-admin/companies", { cache: "no-store" });
    const text = await r.text();
    let j: any = {};
    try { j = JSON.parse(text); } catch {}
    if (!r.ok) {
      console.log("GET companies failed:", r.status, text);
      alert(j?.error || `Load failed (${r.status})`);
      setLoading(false);
      return;
    }
    setCompanies(j.companies || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function createCompany() {
    if (!businessName.trim()) return alert("Business name required");
    if (!email.trim()) return alert("Email required");
    if (!password.trim()) return alert("Password required");
    if (!planDays || planDays < 1) return alert("Plan days must be >= 1");

    const r = await fetch("/api/super-admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: businessName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        planDays,
        enabledModules,
        maxUsers,
      }),
    });

    const text = await r.text();
    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      console.log("CREATE company failed:", r.status, text);
      return alert(j?.error || `Failed (${r.status})`);
    }

    if (j.company) setCompanies((prev) => [j.company, ...prev]);

    setBusinessName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setPlanDays(30);
    setMaxUsers(3);
    setEnabledModules(["DASHBOARD"]);
  }

  function openEdit(c: Company) {
    setEditCompany({ ...c, enabledModules: (c.enabledModules || []) as AppModule[] });
    setEditPassword("");
    setEditOpen(true);
    document.body.style.overflow = "hidden";
  }

  function closeEdit() {
    setEditOpen(false);
    setEditCompany(null);
    setEditPassword("");
    document.body.style.overflow = "";
  }

  async function saveEdit() {
    if (!editCompany) return;

    const payload = {
      businessName: editCompany.businessName,
      email: editCompany.email,
      phone: editCompany.phone,
      planDays: editCompany.planDays,
      maxUsers: editCompany.maxUsers,
      enabledModules: editCompany.enabledModules,
      isActive: editCompany.isActive,
      ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
    };

    console.log("PATCH payload =>", payload);

    const r = await fetch(`/api/super-admin/companies/${editCompany._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.log("PATCH status =>", r.status, text);

    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      alert(j?.error || `Failed (${r.status})`);
      return;
    }

    setCompanies((prev) =>
      prev.map((x) => (x._id === editCompany._id ? (j.company as Company) : x))
    );
    closeEdit();
  }

  async function toggleCompanyActive(c: Company) {
    const payload = { isActive: !c.isActive };
    console.log("toggle company =>", c._id, payload);

    const r = await fetch(`/api/super-admin/companies/${c._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.log("toggle status =>", r.status, text);

    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      alert(j?.error || `Failed (${r.status})`);
      return;
    }

    setCompanies((prev) => prev.map((x) => (x._id === c._id ? j.company : x)));
  }

  async function strictDeleteCompany(c: Company) {
    const confirmEmail = prompt("Confirm company EMAIL (exact) to delete permanently:");
    if (!confirmEmail) return;

    const confirmPassword = prompt("Confirm company PASSWORD to delete permanently:");
    if (!confirmPassword) return;

    const ok = confirm("LAST WARNING: This will permanently delete company + its users. Continue?");
    if (!ok) return;

    setDeletingId(c._id);

    try {
      const r = await fetch(`/api/super-admin/companies/${c._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail, password: confirmPassword }),
      });

      const text = await r.text();
      console.log("DELETE status =>", r.status, text);

      let j: any = {};
      try { j = JSON.parse(text); } catch {}

      if (!r.ok) {
        alert(j?.error || `Delete failed (${r.status})`);
        return;
      }

      // ✅ UI cleanup (important)
      setCompanies((prev) => prev.filter((x) => x._id !== c._id));

      if (openUsersFor === c._id) {
        setOpenUsersFor(null);
        setCompanyUsers([]);
      }

      // if edit modal open for same company, close it
      if (editCompany?._id === c._id) closeEdit();

      // optional: re-fetch list to be 100% sure
      await loadCompanies();
    } finally {
      setDeletingId(null);
    }
  }

  async function loadCompanyUsers(companyId: string) {
    setUsersLoading(true);
    const r = await fetch(`/api/super-admin/companies/${companyId}/users`, { cache: "no-store" });
    const text = await r.text();
    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      console.log("GET users failed:", r.status, text);
      alert(j?.error || `Failed (${r.status})`);
      setUsersLoading(false);
      return;
    }

    setCompanyUsers(j.users || []);
    setUsersLoading(false);
  }

  async function toggleUserActive(companyId: string, user: CompanyUser) {
    const payload = { isActive: !user.isActive };
    console.log("toggle user =>", companyId, user._id, payload);

    const r = await fetch(`/api/super-admin/companies/${companyId}/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.log("toggle user status =>", r.status, text);

    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      alert(j?.error || `Failed (${r.status})`);
      return;
    }

    setCompanyUsers((prev) => prev.map((u) => (u._id === user._id ? j.user : u)));
  }

  const sorted = useMemo(() => {
    return [...companies].sort((a, b) => a.businessName.localeCompare(b.businessName));
  }, [companies]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Super Admin</div>
            <div className="text-white/60 text-sm">Companies + Plans + Modules + Users</div>
          </div>
          <button className={btnGhost} onClick={loadCompanies}>
            Refresh
          </button>
        </div>

        {/* Create Company */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Create Company</div>
              <div className="text-white/60 text-sm">
                Create company + auto-create owner user (same email/password)
              </div>
            </div>
            <button className={btnPrimary} onClick={createCompany}>
              Create
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <label className="text-sm text-white/70">Business Name</label>
              <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />

              <label className="text-sm text-white/70">Owner Email</label>
              <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />

              <label className="text-sm text-white/70">Owner Password</label>
              <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

              <label className="text-sm text-white/70">Phone</label>
              <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Plan Days</label>
                  <input className={input} type="number" min={1} value={planDays} onChange={(e) => setPlanDays(Number(e.target.value))} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Max Users</label>
                  <input className={input} type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
                </div>
              </div>

              <div className="text-xs text-white/50">
                Note: Password DB me hash me save hoga (secure). Super Admin reset/update kar sakta hai.
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Enabled Modules (Company Subscription)</div>
              <div className="max-h-[340px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                <ModulePicker value={enabledModules} onChange={setEnabledModules} />
              </div>
            </div>
          </div>
        </div>

        {/* Companies list */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">All Companies</div>
            <div className="text-white/60 text-sm">
              Active/Deactive keeps data safe. Delete is strict.
            </div>
          </div>

          {loading ? (
            <div className="text-white/60">Loading...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left">Business</th>
                    <th className="py-3 text-left">Email / Phone</th>
                    <th className="py-3 text-left">Plan</th>
                    <th className="py-3 text-left">Users</th>
                    <th className="py-3 text-left">Modules</th>
                    <th className="py-3 text-left">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((c) => (
                    <Fragment key={c._id}>
                      <tr className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-semibold">{c.businessName}</td>
                        <td className="py-3">
                          <div className="text-white/90">{c.email}</div>
                          <div className="text-white/60 text-xs">{c.phone || "—"}</div>
                        </td>
                        <td className="py-3 text-white/80">
                          <div>{c.planDays} days</div>
                          <div className="text-white/60 text-xs">Expire: {fmtDate(c.planExpiresAt)}</div>
                        </td>
                        <td className="py-3 text-white/80">{c.maxUsers}</td>
                        <td className="py-3 text-white/70">
                          {(c.enabledModules || []).slice(0, 3).join(", ")}
                          {(c.enabledModules || []).length > 3 ? "…" : ""}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              c.isActive
                                ? "border-green-500/40 bg-green-500/10 text-green-200"
                                : "border-red-500/40 bg-red-500/10 text-red-200"
                            }`}
                          >
                            {c.isActive ? "Active" : "Deactive"}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button className={btnGhost} onClick={() => openEdit(c)}>Edit</button>

                            <button
                              className={btnGhost}
                              onClick={async () => {
                                if (openUsersFor === c._id) {
                                  setOpenUsersFor(null);
                                  setCompanyUsers([]);
                                } else {
                                  setOpenUsersFor(c._id);
                                  await loadCompanyUsers(c._id);
                                }
                              }}
                            >
                              {openUsersFor === c._id ? "Hide Users" : "Users"}
                            </button>

                            <button className={btnGhost} onClick={() => toggleCompanyActive(c)}>
                              {c.isActive ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              className={btnDanger}
                              onClick={() => strictDeleteCompany(c)}
                              disabled={deletingId === c._id}
                            >
                              {deletingId === c._id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {openUsersFor === c._id && (
                        <tr className="border-b border-white/10 bg-black/20">
                          <td colSpan={7} className="py-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-semibold">Users of {c.businessName}</div>
                              <button className={btnGhost} onClick={() => loadCompanyUsers(c._id)}>
                                Refresh Users
                              </button>
                            </div>

                            {usersLoading ? (
                              <div className="text-white/60">Loading users...</div>
                            ) : (
                              <div className="overflow-auto">
                                <table className="w-full text-sm">
                                  <thead className="text-white/60">
                                    <tr className="border-b border-white/10">
                                      <th className="py-2 text-left">Email</th>
                                      <th className="py-2 text-left">Name</th>
                                      <th className="py-2 text-left">Owner</th>
                                      <th className="py-2 text-left">Status</th>
                                      <th className="py-2 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {companyUsers.map((u) => (
                                      <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2">{u.email}</td>
                                        <td className="py-2 text-white/70">{u.name || "—"}</td>
                                        <td className="py-2 text-white/70">{u.isOwner ? "Yes" : "No"}</td>
                                        <td className="py-2">
                                          <span
                                            className={`text-xs px-2 py-1 rounded-full border ${
                                              u.isActive
                                                ? "border-green-500/40 bg-green-500/10 text-green-200"
                                                : "border-red-500/40 bg-red-500/10 text-red-200"
                                            }`}
                                          >
                                            {u.isActive ? "Active" : "Deactive"}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          <div className="flex justify-end">
                                            <button
                                              className={btnGhost}
                                              onClick={() => toggleUserActive(c._id, u)}
                                              disabled={u.isOwner}
                                            >
                                              {u.isActive ? "Deactivate" : "Activate"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    {companyUsers.length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="py-4 text-white/60">No users found.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-white/60">No companies found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editOpen && editCompany && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0B0F19] p-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Edit Company</div>
                <button className={btnGhost} onClick={closeEdit}>Close</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <label className="text-sm text-white/70">Business Name</label>
                  <input className={input} value={editCompany.businessName} onChange={(e) => setEditCompany({ ...editCompany, businessName: e.target.value })} />

                  <label className="text-sm text-white/70">Email (Owner Login)</label>
                  <input className={input} value={editCompany.email} onChange={(e) => setEditCompany({ ...editCompany, email: e.target.value })} />

                  <label className="text-sm text-white/70">New Password (optional)</label>
                  <input className={input} type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave empty to keep same" />

                  <label className="text-sm text-white/70">Phone</label>
                  <input className={input} value={editCompany.phone || ""} onChange={(e) => setEditCompany({ ...editCompany, phone: e.target.value })} />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm text-white/70">Plan Days</label>
                      <input className={input} type="number" min={1} value={editCompany.planDays} onChange={(e) => setEditCompany({ ...editCompany, planDays: Number(e.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-white/70">Max Users</label>
                      <input className={input} type="number" min={1} value={editCompany.maxUsers} onChange={(e) => setEditCompany({ ...editCompany, maxUsers: Number(e.target.value) })} />
                    </div>
                  </div>

                  <label className="text-sm text-white/70">Company Status</label>
                  <select className={input} value={editCompany.isActive ? "active" : "deactive"} onChange={(e) => setEditCompany({ ...editCompany, isActive: e.target.value === "active" })}>
                    <option value="active">Active</option>
                    <option value="deactive">Deactive</option>
                  </select>

                  <div className="flex justify-end gap-2 mt-2">
                    <button className={btnGhost} onClick={closeEdit}>Cancel</button>
                    <button className={btnPrimary} onClick={saveEdit}>Save Changes</button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Enabled Modules</div>
                  <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                    <ModulePicker
                      value={(editCompany.enabledModules || []) as AppModule[]}
                      onChange={(mods) => setEditCompany({ ...editCompany, enabledModules: mods })}
                    />
                  </div>

                  <div className="text-xs text-white/50 mt-2">
                    Tip: Modules change karne se sidebar/pages access change hoga. Direct URL pe bhi API guard se block hoga.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


