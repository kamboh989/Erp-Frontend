"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePicker from "@/app/components/module-picker";
import SettingPicker from "@/app/components/setting-picker";
import type { AppModule } from "@/types/modules";
import type { AppSetting } from "@/types/settings";
import { useRouter } from "next/navigation";

type CompanyUser = {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: "ADMIN" | "STAFF";
  isOwner?: boolean;
  isActive?: boolean;
  allowedModules?: AppModule[];
  allowedSettings?: AppSetting[]; 
  createdAt?: string;
};

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl";
const btnPrimary =
  "rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold";
const btnGhost = "rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm";
const btnDanger =
  "rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold";
const input =
  "rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500";

function mapApiError(code: string) {
  if (!code) return "Failed";

  switch (code) {
    case "SAME_PASSWORD_NOT_ALLOWED_ACROSS_COMPANIES":
      return "This email already exists in another company. Please set a different password for this company.";
    case "EMAIL_ALREADY_EXISTS_IN_COMPANY":
      return "This email already exists in this company.";
    case "PASSWORD_REQUIRED_WHEN_EMAIL_USED_IN_OTHER_COMPANY":
      return "This email is used in another company. Please also set a NEW password in the same update.";
    case "FORBIDDEN":
      return "Forbidden.";
    case "LOCKED_BY_SUPER_ADMIN":
      return "This user is locked by super admin and cannot be activated.";
    default:
      return code;
  }
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);

  // create
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [allowedModules, setAllowedModules] = useState<AppModule[]>(["DASHBOARD"]);

  // ✅ NEW create allowed settings
  const [allowedSettings, setAllowedSettings] = useState<AppSetting[]>([
    "SETTINGS_CRM",
    "SETTINGS_META",
  ]);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<CompanyUser | null>(null);
  const [editPassword, setEditPassword] = useState("");

  async function loadSession() {
    const r = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });
    const j = await r.json();
    setSession(j?.session || null);
    return j?.session || null;
  }

  async function loadUsers() {
    setLoading(true);
    const r = await fetch("/api/company/users", {
      cache: "no-store",
      credentials: "include",
    });
    const j = await r.json();
    if (!r.ok) {
      alert(mapApiError(j?.error) || "Failed to load users");
      setLoading(false);
      return;
    }
    setUsers(j?.users || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (!s) {
        router.replace("/auth/login");
        return;
      }
      const admin = Boolean(s.isOwner) || s.role === "ADMIN";
      if (!admin) {
        alert("Forbidden: Admin only");
        router.replace("/dashboard");
        return;
      }
      await loadUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser() {
    if (!name.trim() || !email.trim() || !password.trim())
      return alert("name/email/password required");

    const r = await fetch("/api/company/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role,
        allowedModules,
        allowedSettings, 
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(mapApiError(j?.error));

    setUsers((p) => [j.user, ...p]);
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("STAFF");
    setAllowedModules(["DASHBOARD"]);
    setAllowedSettings(["SETTINGS_CRM", "SETTINGS_META"]);
  }

  function openEdit(u: CompanyUser) {
    setEditUser({
      ...u,
      allowedModules: (u.allowedModules || []) as AppModule[],
      allowedSettings: (u.allowedSettings || []) as AppSetting[],
    });
    setEditPassword("");
    setEditOpen(true);
    document.body.style.overflow = "hidden";
  }

  function closeEdit() {
    setEditOpen(false);
    setEditUser(null);
    setEditPassword("");
    document.body.style.overflow = "";
  }

  async function saveEdit() {
    if (!editUser) return;

    const r = await fetch(`/api/company/users/${editUser._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
        allowedModules: editUser.allowedModules,
        allowedSettings: editUser.allowedSettings, // ✅ NEW
        ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(mapApiError(j?.error));

    setUsers((p) => p.map((x) => (x._id === editUser._id ? j.user : x)));
    closeEdit();
  }

  async function toggleActive(u: CompanyUser) {
    const r = await fetch(`/api/company/users/${u._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !u.isActive }),
    });

    const j = await r.json();
    if (!r.ok) return alert(mapApiError(j?.error));
    setUsers((p) => p.map((x) => (x._id === u._id ? j.user : x)));
  }

  async function strictDelete(u: CompanyUser) {
    if (u.isOwner) return alert("Owner cannot be deleted");

    const confirmEmail = prompt("Confirm USER EMAIL (exact) to delete permanently:");
    if (!confirmEmail) return;

    const confirmPassword = prompt("Confirm USER PASSWORD to delete permanently:");
    if (!confirmPassword) return;

    const ok = confirm("LAST WARNING: user will be permanently deleted. Continue?");
    if (!ok) return;

    const r = await fetch(`/api/company/users/${u._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: confirmEmail, password: confirmPassword }),
    });

    const j = await r.json();
    if (!r.ok) return alert(mapApiError(j?.error) || "Delete failed");

    setUsers((p) => p.filter((x) => x._id !== u._id));
  }

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Admin Control</div>
            <div className="text-white/60 text-sm">
              Create/Edit users • Active/Deactive • Strict Delete
            </div>
          </div>
          <button className={btnGhost} onClick={loadUsers}>
            Refresh
          </button>
        </div>

        {/* Create */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Create User</div>
              <div className="text-white/60 text-sm">
                Phone optional. Role: Admin/Staff. Modules + Settings assignable.
              </div>
            </div>
            <button className={btnPrimary} onClick={createUser}>
              Create
            </button>
          </div>

          <div className="grid md:grid-cols-[0.7fr_1.6fr] gap-6">
           <div className="grid gap-2">
  <div className="flex flex-col gap-5">
    <label className="text-sm text-white/70">Name</label>
    <input className={input} value={name} onChange={(e) => setName(e.target.value)} />

    <label className="text-sm text-white/70">Email</label>
    <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />

    <label className="text-sm text-white/70">Password</label>
    <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

    <label className="text-sm text-white/70">Phone (optional)</label>
    <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />

    <label className="text-sm text-white/70">Role</label>
    <select className={input} value={role} onChange={(e) => setRole(e.target.value as any)}>
      <option value="STAFF">Staff</option>
      <option value="ADMIN">Admin</option>
    </select>

    <span className="text-xs text-white/60">
      If Admin role is selected, the user will get the same access as Owner — except Owner profile and Owner-only modules.
    </span>
  </div>
</div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2">Allowed Modules</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <ModulePicker value={allowedModules} onChange={setAllowedModules} />
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Allowed Settings</div>
                <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
                  <SettingPicker value={allowedSettings} onChange={setAllowedSettings} />
                </div>
               
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className={card}>
          <div className="text-lg font-semibold mb-4">Users</div>

          {loading ? (
            <div className="text-white/60">Loading...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm min-w-[1400px]">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left">User</th>
                    <th className="py-3 text-left">Phone</th>
                    <th className="py-3 text-left">Role</th>
                    <th className="py-3 text-left">Modules</th>
                    <th className="py-3 text-left">Settings</th>
                    <th className="py-3 text-left">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((u) => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3">
                        <div className="font-semibold">{u.name || "—"}</div>
                        <div className="text-white/70 text-xs">{u.email}</div>
                      </td>

                      <td className="py-3 text-white/80">{u.phone || "—"}</td>

                      <td className="py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                          {u.isOwner ? "OWNER" : u.role || "STAFF"}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-[420px]">
                          {(u.allowedModules || []).map((m) => (
                            <span key={m} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                              {m}
                            </span>
                          ))}
                          {(u.allowedModules || []).length === 0 && (
                            <span className="text-xs text-white/50">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-[420px]">
                          {(u.allowedSettings || []).map((s) => (
                            <span key={s} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                              {s}
                            </span>
                          ))}
                          {(u.allowedSettings || []).length === 0 && (
                            <span className="text-xs text-white/50">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3">
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

                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button className={btnGhost} onClick={() => openEdit(u)}>
                            Edit
                          </button>

                          <button className={btnGhost} onClick={() => toggleActive(u)} disabled={u.isOwner}>
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>

                          <button className={btnDanger} onClick={() => strictDelete(u)} disabled={u.isOwner}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-white/60">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit modal */}
        {editOpen && editUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0B0F19] p-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Edit User</div>
                <button className={btnGhost} onClick={closeEdit}>
                  Close
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <label className="text-sm text-white/70">Name</label>
                  <input
                    className={input}
                    value={editUser.name || ""}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  />

                  <label className="text-sm text-white/70">Email</label>
                  <input
                    className={input}
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  />

                  <label className="text-sm text-white/70">Phone</label>
                  <input
                    className={input}
                    value={editUser.phone || ""}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  />

                  <label className="text-sm text-white/70">Role</label>
                  <select
                    className={input}
                    value={editUser.role || "STAFF"}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <label className="text-sm text-white/70">New Password (optional)</label>
                  <input
                    className={input}
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />

                  <div className="flex justify-end gap-2 mt-2">
                    <button className={btnGhost} onClick={closeEdit}>
                      Cancel
                    </button>
                    <button className={btnPrimary} onClick={saveEdit}>
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold mb-2">Allowed Modules</div>
                    <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                      <ModulePicker
                        value={(editUser.allowedModules || []) as AppModule[]}
                        onChange={(mods) => setEditUser({ ...editUser, allowedModules: mods })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Allowed Settings</div>
                    <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                      <SettingPicker
                        value={(editUser.allowedSettings || []) as AppSetting[]}
                        onChange={(s) => setEditUser({ ...editUser, allowedSettings: s })}
                      />
                    </div>
                   
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