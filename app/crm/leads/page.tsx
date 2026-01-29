"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  businessName?: string;
  source: "MANUAL" | "META";
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "LOST";
  assignedTo?: { _id: string; name?: string; email: string } | null;
  createdAt: string;
  activities?: { type: string; note?: string; createdAt: string }[];
};

type User = { _id: string; name?: string; email: string };

const shell = "max-w-7xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg";
const glow =
  "bg-gradient-to-r from-blue-700 to-indigo-500 text-white shadow-md hover:shadow-lg hover:-translate-y-[1px] transition";
const btn =
  "rounded-xl px-4 py-2 text-sm font-semibold " + glow;
const btnGhost =
  "rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function LeadsPage() {
  const [session, setSession] = useState<any>(null);

  const [stats, setStats] = useState({ total: 0, newLeads: 0, inProgress: 0, converted: 0 });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);

  // add form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const isAdmin = useMemo(() => Boolean(session?.isOwner) || session?.role === "ADMIN", [session]);

  async function loadAll() {
    setLoading(true);

    const me = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" }).then(r => r.json());
    const s = me?.session;
    setSession(s);

    const [ls, st] = await Promise.all([
      fetch("/api/crm/leads", { cache: "no-store", credentials: "include" }).then(r => r.json()),
      fetch("/api/crm/leads/stats", { cache: "no-store", credentials: "include" }).then(r => r.json()),
    ]);

    setLeads(ls?.leads || []);
    setSelected((ls?.leads || [])[0] || null);
    setStats({
      total: st?.total || 0,
      newLeads: st?.newLeads || 0,
      inProgress: st?.inProgress || 0,
      converted: st?.converted || 0,
    });

    // users for assign dropdown (only admin needs)
    if (Boolean(s?.isOwner) || s?.role === "ADMIN") {
      const uj = await fetch("/api/company/users/active", { cache: "no-store", credentials: "include" }).then(r => r.json());
      setUsers(uj?.users || []);
    } else {
      setUsers([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setName("");
    setPhone("");
    setEmail("");
    setBusinessName("");
    setAssignedTo("");
    setAddOpen(true);
    document.body.style.overflow = "hidden";
  }

  function closeAdd() {
    setAddOpen(false);
    document.body.style.overflow = "";
  }

  async function createLead() {
    const r = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        phone,
        email,
        businessName,
        ...(isAdmin ? { assignedTo: assignedTo || null } : {}),
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Create failed");

    // ✅ instant UI update
    const newLead = j.lead as Lead;
    setLeads((p) => [newLead, ...p]);
    setSelected(newLead);

    // refresh stats quickly
    const st = await fetch("/api/crm/leads/stats", { cache: "no-store", credentials: "include" }).then(r => r.json());
    setStats({
      total: st?.total || 0,
      newLeads: st?.newLeads || 0,
      inProgress: st?.inProgress || 0,
      converted: st?.converted || 0,
    });

    closeAdd();
  }

  async function updateLead(patch: any) {
    if (!selected) return;

    const r = await fetch(`/api/crm/leads/${selected._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Update failed");

    const updated = j.lead as Lead;
    setSelected(updated);
    setLeads((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));

    // update stats
    const st = await fetch("/api/crm/leads/stats", { cache: "no-store", credentials: "include" }).then(r => r.json());
    setStats({
      total: st?.total || 0,
      newLeads: st?.newLeads || 0,
      inProgress: st?.inProgress || 0,
      converted: st?.converted || 0,
    });
  }

  const list = useMemo(() => leads, [leads]);

  if (loading) return <div className={shell}>Loading...</div>;

  return (
    <div className={shell}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">Leads</div>
          <div className="text-gray-500 text-sm">Manual + Meta</div>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={loadAll}>Refresh</button>
          <button className={btn} onClick={openAdd}>+ Add Lead</button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className={card}>
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-blue-700 to-indigo-500" />
        </div>

        <div className={card}>
          <div className="text-sm text-gray-500">New</div>
          <div className="text-2xl font-bold text-gray-900">{stats.newLeads}</div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-black to-blue-700" />
        </div>

        <div className={card}>
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
        </div>

        <div className={card}>
          <div className="text-sm text-gray-500">Converted</div>
          <div className="text-2xl font-bold text-gray-900">{stats.converted}</div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-black" />
        </div>
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* List */}
        <div className={"lg:col-span-2 " + card}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold text-gray-900">Leads List</div>
            <div className="text-xs text-gray-500">Click a row to view details</div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b border-black/10">
                <tr>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Source</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Owner</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => {
                  const active = selected?._id === l._id;
                  return (
                    <tr
                      key={l._id}
                      onClick={() => setSelected(l)}
                      className={`border-b border-black/5 cursor-pointer transition ${
                        active ? "bg-gradient-to-r from-blue-50 to-indigo-50" : "hover:bg-black/5"
                      }`}
                    >
                      <td className="py-3 font-semibold text-gray-900">{l.name}</td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-black/5 border border-black/10">
                          {l.source}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-800">
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-700">{l.assignedTo?.name || l.assignedTo?.email || "Unassigned"}</td>
                    </tr>
                  );
                })}

                {list.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-gray-500">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details */}
        <div className={card}>
          <div className="text-lg font-semibold text-gray-900 mb-3">Lead Details</div>

          {!selected ? (
            <div className="text-gray-500">Select a lead</div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-semibold text-gray-900">{selected.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-semibold text-gray-900">{selected.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-900">{selected.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Business</span>
                  <span className="font-semibold text-gray-900">{selected.businessName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="font-semibold text-gray-900">{selected.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-semibold text-gray-900">{fmt(selected.createdAt)}</span>
                </div>
              </div>

              <div className="h-4" />

              {/* Status change */}
              <label className="text-sm text-gray-600">Status</label>
              <select
                className={input}
                value={selected.status}
                onChange={(e) => updateLead({ status: e.target.value })}
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
                <option value="INTERESTED">INTERESTED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="LOST">LOST</option>
              </select>

              <div className="h-3" />

              {/* Assign (admin only) */}
              {isAdmin && (
                <>
                  <label className="text-sm text-gray-600">Assign to</label>
                  <select
                    className={input}
                    value={(selected.assignedTo?._id || "") as string}
                    onChange={(e) => updateLead({ assignedTo: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="h-4" />

              {/* Add note */}
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="Add note…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (!v) return;
                      (e.target as HTMLInputElement).value = "";
                      updateLead({ addNote: v });
                    }
                  }}
                />
                <button
                  className={btnGhost}
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>("#noteBox");
                    if (!el) return;
                  }}
                >
                  Add
                </button>
              </div>

              <div className="h-4" />

              <div className="text-sm font-semibold text-gray-900 mb-2">Activity Timeline</div>
              <div className="space-y-2">
                {(selected.activities || []).slice().reverse().slice(0, 8).map((a, idx) => (
                  <div key={idx} className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm">
                    <div className="text-gray-900 font-semibold">{a.type}</div>
                    <div className="text-gray-700">{a.note || "—"}</div>
                    <div className="text-xs text-gray-500 mt-1">{fmt(a.createdAt)}</div>
                  </div>
                ))}
                {(selected.activities || []).length === 0 && (
                  <div className="text-gray-500 text-sm">No activity yet.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-900">Add Lead</div>
              <button className={btnGhost} onClick={closeAdd}>Close</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Business Name</label>
                <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx..." />
              </div>

              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
              </div>

              {/* Assign only for admin */}
              {isAdmin && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Assign to (active users)</label>
                  <select className={input} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className={btnGhost} onClick={closeAdd}>Cancel</button>
              <button className={btn} onClick={createLead}>Create Lead</button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Timestamp auto create hota hai. Source MANUAL auto set hota hai. Status default NEW.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
