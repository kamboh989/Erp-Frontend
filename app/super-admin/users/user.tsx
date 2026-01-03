"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePicker from "@/app/components/module-picker";
import type { AppModule } from "@/types/modules";

type Company = { _id: string; name: string; enabledModules: AppModule[] };
type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  companyId?: string | null;
  allowedModules?: AppModule[];
  isActive?: boolean;
};

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl";
const btnPrimary =
  "rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold";
const btnGhost =
  "rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm";
const btnDanger =
  "rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold";

export default function UsersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("COMPANY_ADMIN");
  const [allowedModules, setAllowedModules] = useState<AppModule[]>(["DASHBOARD"]);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    const c = await fetch("/api/super-admin/companies", { cache: "no-store" }).then((r) => r.json());
    const u = await fetch("/api/super-admin/users", { cache: "no-store" }).then((r) => r.json());
    setCompanies(c.companies || []);
    setUsers(u.users || []);
    if (!companyId && c.companies?.[0]?._id) setCompanyId(c.companies[0]._id);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser() {
    if (!email.trim() || !password.trim()) return alert("Email & password required");
    if (role !== "SUPER_ADMIN" && !companyId) return alert("Company required");

    const r = await fetch("/api/super-admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        companyId: role === "SUPER_ADMIN" ? null : companyId,
        allowedModules: role === "SUPER_ADMIN" ? [] : allowedModules,
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to create user");

    setEmail("");
    setPassword("");
    setName("");
    setAllowedModules(["DASHBOARD"]);
    await load();
  }

  function openEdit(u: User) {
    setEditUser({
      ...u,
      allowedModules: (u.allowedModules || []) as AppModule[],
      isActive: u.isActive ?? true,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUser) return;

    const r = await fetch(`/api/super-admin/users/${editUser._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editUser.name,
        role: editUser.role,
        companyId: editUser.role === "SUPER_ADMIN" ? null : editUser.companyId,
        allowedModules: editUser.role === "SUPER_ADMIN" ? [] : editUser.allowedModules,
        isActive: editUser.isActive,
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to update user");

    setEditOpen(false);
    setEditUser(null);
    await load();
  }

  async function deleteUser(id: string) {
    const ok = confirm("Delete this user?");
    if (!ok) return;
    const r = await fetch(`/api/super-admin/users/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Failed to delete");
    await load();
  }

  const companyMap = useMemo(() => {
    const m = new Map<string, Company>();
    companies.forEach((c) => m.set(c._id, c));
    return m;
  }, [companies]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <button className={btnGhost} onClick={load}>
            Refresh
          </button>
        </div>

        {/* Create */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create User</h2>
            <button className={btnPrimary} onClick={createUser}>
              Create
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
              />

              <label className="text-sm text-white/70 mt-2">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
              />

              <label className="text-sm text-white/70 mt-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
              />

              <label className="text-sm text-white/70 mt-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none"
              >
                <option value="COMPANY_ADMIN">Company Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="STAFF">Staff</option>
              </select>

              <label className="text-sm text-white/70 mt-2">Company</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={role === "SUPER_ADMIN"}
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none disabled:opacity-50"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="text-xs text-white/50 mt-2">
                Note: Super Admin ko company/module assign nahi hota.
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Allowed Modules (User Access)</div>
              {role === "SUPER_ADMIN" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
                  Super Admin has full access. No module selection needed.
                </div>
              ) : (
                <ModulePicker value={allowedModules} onChange={setAllowedModules} />
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className={card}>
          <div className="text-lg font-semibold mb-4">All Users</div>

          {loading ? (
            <div className="text-white/60">Loading...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left">User</th>
                    <th className="py-3 text-left">Role</th>
                    <th className="py-3 text-left">Company</th>
                    <th className="py-3 text-left">Active</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedUsers.map((u) => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3">
                        <div className="font-semibold">{u.email}</div>
                        <div className="text-white/60 text-xs">{u.name || "—"}</div>
                      </td>
                      <td className="py-3 text-white/80">{u.role}</td>
                      <td className="py-3 text-white/70">
                        {u.companyId ? companyMap.get(u.companyId)?.name || "—" : "—"}
                      </td>
                      <td className="py-3 text-white/70">{u.isActive ? "Yes" : "No"}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button className={btnGhost} onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          <button className={btnDanger} onClick={() => deleteUser(u._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sortedUsers.length === 0 && (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={5}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editOpen && editUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0B0F19] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Edit User</div>
                <button className={btnGhost} onClick={() => setEditOpen(false)}>
                  Close
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Name</label>
                  <input
                    value={editUser.name || ""}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500"
                  />

                  <label className="text-sm text-white/70 mt-2">Role</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none"
                  >
                    <option value="COMPANY_ADMIN">Company Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="STAFF">Staff</option>
                  </select>

                  <label className="text-sm text-white/70 mt-2">Company</label>
                  <select
                    value={editUser.companyId || ""}
                    onChange={(e) => setEditUser({ ...editUser, companyId: e.target.value })}
                    className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <label className="text-sm text-white/70 mt-2">Active</label>
                  <select
                    value={editUser.isActive ? "yes" : "no"}
                    onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === "yes" })}
                    className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Allowed Modules</div>
                  <ModulePicker
                    value={(editUser.allowedModules || []) as AppModule[]}
                    onChange={(mods) => setEditUser({ ...editUser, allowedModules: mods })}
                  />
                </div>
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
        )}

      </div>
    </div>
  );
}
