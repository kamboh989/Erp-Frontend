"use client";

import { useEffect, useState } from "react";

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl";
const input = "rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-blue-500";
const btnPrimary = "rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold";
const btnGhost = "rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm";

function firstLetter(name: string) {
  const s = (name || "").trim();
  return s ? s[0].toUpperCase() : "U";
}

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/company/profile", { cache: "no-store", credentials: "include" });
    const j = await r.json();
    setMe(j?.me || null);
    setNewEmail(j?.me?.email || "");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveOwnerCreds() {
    const r = await fetch("/api/company/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: newEmail,
        ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Failed");
    setNewPassword("");
    await load();
    alert("Updated");
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!me) return <div className="p-6">Session expired</div>;

  const roleLabel = me.isOwner ? "Owner" : (me.role === "ADMIN" ? "Admin" : "Staff");

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className={card}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-xl font-bold">
              {firstLetter(me.name || "User")}
            </div>

            <div>
              <div className="text-xl font-bold">{me.name || "User"}</div>
              <div className="text-white/70 text-sm">{roleLabel}</div>
              <div className="text-white/60 text-sm">{me.email}</div>
            </div>
          </div>
        </div>

        {me.isOwner && (
          <div className={card}>
            <div className="text-lg font-semibold mb-1">Owner Credentials</div>
            <div className="text-white/60 text-sm mb-4">Only owner can change owner email/password.</div>

            <div className="grid gap-3">
              <label className="text-sm text-white/70">Owner Email</label>
              <input className={input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />

              <label className="text-sm text-white/70">New Password (optional)</label>
              <input className={input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

              <div className="flex gap-2 justify-end">
                <button className={btnGhost} onClick={load}>Reset</button>
                <button className={btnPrimary} onClick={saveOwnerCreds}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
