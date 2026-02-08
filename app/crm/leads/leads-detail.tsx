"use client";

import Loader from "@/app/components/Loader";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Assignee = { _id: string; name?: string; email: string };

type Lead = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  businessName?: string;
  source: "MANUAL" | "META";
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "LOST";

  // ✅ NEW: multiple assignees
  assignedToIds?: Assignee[];

  createdAt: string;

  // ✅ NEW: follow-up fields
  nextFollowUpAt?: string | null;
  followUpType?: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL";
  followUpNote?: string;

  activities?: { type: string; note?: string; createdAt: string }[];
};

type User = { _id: string; name?: string; email: string };

const shell = "max-w-7xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg";
const glow =
  "bg-gradient-to-r from-blue-700 to-indigo-500 text-white shadow-md hover:shadow-lg hover:-translate-y-[1px] transition";
const btn = "rounded-xl px-4 py-2 text-sm font-semibold " + glow;
const btnGhost =
  "rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

// ✅ Owner label for list
function assigneeLabel(arr?: Assignee[]) {
  const list = arr || [];
  if (list.length === 0) return "Unassigned";
  if (list.length === 1) return list[0].name || list[0].email;
  const first = list[0].name || list[0].email;
  return `${first} +${list.length - 1}`;
}

function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function LeadsPage() {
  const [session, setSession] = useState<any>(null);

  const [stats, setStats] = useState({
    total: 0,
    newLeads: 0,
    inProgress: 0,
    converted: 0,
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);

  // note input
  const [noteText, setNoteText] = useState("");

  // ✅ follow-up inputs (local edit, saved through updateLead)
  const [followUpType, setFollowUpType] = useState<
    "CALL" | "MEETING" | "WHATSAPP" | "EMAIL"
  >("CALL");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  // add form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  // ✅ NEW: multi-assign in modal (admin only)
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);

  const isAdmin = useMemo(
    () => Boolean(session?.isOwner) || session?.role === "ADMIN",
    [session]
  );

  const isOwner = useMemo(() => Boolean(session?.isOwner), [session]);

  async function loadAll() {
    setLoading(true);

    const me = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    const s = me?.session;
    setSession(s);

    const [ls, st] = await Promise.all([
      fetch("/api/crm/leads", {
        cache: "no-store",
        credentials: "include",
      }).then((r) => r.json()),
      fetch("/api/crm/leads/stats", {
        cache: "no-store",
        credentials: "include",
      }).then((r) => r.json()),
    ]);

    const nextLeads: Lead[] = ls?.leads || [];
    setLeads(nextLeads);

    const first = nextLeads[0] || null;
    setSelected(first);

    setStats({
      total: st?.total || 0,
      newLeads: st?.newLeads || 0,
      inProgress: st?.inProgress || 0,
      converted: st?.converted || 0,
    });

    // users for assign checkbox list (only admin/owner)
    if (Boolean(s?.isOwner) || s?.role === "ADMIN") {
      const uj = await fetch("/api/company/users/active", {
        cache: "no-store",
        credentials: "include",
      }).then((r) => r.json());
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

  // keep follow-up local inputs in sync when selected changes
  useEffect(() => {
    if (!selected) return;
    setFollowUpType((selected.followUpType as any) || "CALL");
    setNextFollowUpAt(toDatetimeLocalValue(selected.nextFollowUpAt || null));
    setFollowUpNote(selected.followUpNote || "");
  }, [selected]);

  function openAdd() {
    setName("");
    setPhone("");
    setEmail("");
    setBusinessName("");
    setAssignedToIds([]);
    setAddOpen(true);
    document.body.style.overflow = "hidden";
  }

  function closeAdd() {
    setAddOpen(false);
    document.body.style.overflow = "";
  }

  async function refreshStatsOnly() {
    const st = await fetch("/api/crm/leads/stats", {
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    setStats({
      total: st?.total || 0,
      newLeads: st?.newLeads || 0,
      inProgress: st?.inProgress || 0,
      converted: st?.converted || 0,
    });
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
        ...(isAdmin ? { assignedToIds } : {}),
      }),
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Create failed");

    const newLead = j.lead as Lead;

    // ✅ instant UI update
    setLeads((p) => [newLead, ...p]);
    setSelected(newLead);
    await refreshStatsOnly();

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

    await refreshStatsOnly();
  }

  async function deleteLead() {
    if (!selected) return;
    if (!isOwner) return;

    const ok = confirm(
      "Delete this lead? (It will be removed from active leads.)"
    );
    if (!ok) return;

    const r = await fetch(`/api/crm/leads/${selected._id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Delete failed");

    // ✅ instant UI update
    setLeads((p) => p.filter((x) => x._id !== selected._id));
    setSelected(null);
    await refreshStatsOnly();
  }

  const list = useMemo(() => leads, [leads]);

  if (loading) {
    return (
      <Loader
        title="Leads"
        subtitle="Loading manual + meta leads"
        variant="page"
        showStats
        rightPanel
        rows={7}
      />
    );
  }

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">Leads</div>
          <div className="text-gray-500 text-sm">Manual + Meta</div>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={loadAll}>
            Refresh
          </button>
          <button className={btn} onClick={openAdd}>
            + Add Lead
          </button>
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
          <div className="text-2xl font-bold text-gray-900">
            {stats.newLeads}
          </div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-black to-blue-700" />
        </div>

        <div className={card}>
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.inProgress}
          </div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
        </div>

        <div className={card}>
          <div className="text-sm text-gray-500">Converted</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.converted}
          </div>
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-black" />
        </div>
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* List */}
        <div className={"lg:col-span-2 " + card}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold text-gray-900">Leads List</div>
            <div className="text-xs text-gray-500">
              Click a row to view details
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b border-black/10">
                <tr>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Source</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Assigned</th>
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
                        active
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50"
                          : "hover:bg-black/5"
                      }`}
                    >
                      <td className="py-3 font-semibold text-gray-900">
                        {l.name}
                      </td>
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
                      <td className="py-3 text-gray-700">
                        {assigneeLabel(l.assignedToIds)}
                      </td>
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
          {/* Header + delete (OWNER ONLY) */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold text-gray-900">
              Lead Details
            </div>

            {isOwner && selected && (
              <button
                className="rounded-xl px-3 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                title="Delete Lead"
                onClick={deleteLead}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {!selected ? (
            <div className="text-gray-500">Select a lead</div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-semibold text-gray-900">
                    {selected.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-semibold text-gray-900">
                    {selected.phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-900">
                    {selected.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Business</span>
                  <span className="font-semibold text-gray-900">
                    {selected.businessName || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="font-semibold text-gray-900">
                    {selected.source}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-semibold text-gray-900">
                    {fmt(selected.createdAt)}
                  </span>
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

              {/* ✅ Multi-assign (Admin/Owner only) */}
              {isAdmin && (
                <>
                  <div className="h-4" />
                  <div className="text-sm text-gray-600 mb-2">
                    Assign to (multiple)
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-xl border border-black/10 bg-black/5 p-3 space-y-2">
                    {users.map((u) => {
                      const has = (selected.assignedToIds || []).some(
                        (x) => x._id === u._id
                      );

                      return (
                        <label
                          key={u._id}
                          className="flex items-center gap-2 text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={has}
                            onChange={(e) => {
                              const current = (selected.assignedToIds || []).map(
                                (x) => x._id
                              );

                              const next = e.target.checked
                                ? Array.from(new Set([...current, u._id]))
                                : current.filter((id) => id !== u._id);

                              updateLead({ assignedToIds: next });
                            }}
                          />
                          <span>{u.name || u.email}</span>
                        </label>
                      );
                    })}
                    {users.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No active users
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ✅ Follow-up (Saved in DB) */}
              <div className="h-4" />
              <div className="text-sm font-semibold text-gray-900 mb-2">
                Follow-up
              </div>

              <label className="text-sm text-gray-600">Type</label>
              <select
                className={input}
                value={followUpType}
                onChange={(e) => {
                  const v = e.target.value as any;
                  setFollowUpType(v);
                  updateLead({ followUp: { followUpType: v } });
                }}
              >
                <option value="CALL">CALL</option>
                <option value="MEETING">MEETING</option>
                <option value="WHATSAPP">WHATSAPP</option>
                <option value="EMAIL">EMAIL</option>
              </select>

              <div className="h-3" />

              <label className="text-sm text-gray-600">
                Next Follow-up Time
              </label>
              <input
                className={input}
                type="datetime-local"
                value={nextFollowUpAt}
                onChange={(e) => {
                  const v = e.target.value;
                  setNextFollowUpAt(v);
                  updateLead({
                    followUp: {
                      nextFollowUpAt: v ? new Date(v).toISOString() : null,
                    },
                  });
                }}
              />

              <div className="h-3" />

              <label className="text-sm text-gray-600">Follow-up Note</label>
              <input
                className={input}
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                onBlur={() => updateLead({ followUp: { followUpNote } })}
                placeholder="e.g. Meeting Tuesday 3pm"
              />

              <div className="mt-2 text-xs text-gray-500">
                Meeting fix / contact time set karo. Ye DB me save hota hai.
              </div>

              <div className="h-4" />

              {/* Add note */}
              <div className="flex gap-2">
                <input
                  className={input}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add note… (e.g. Called client, no answer)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = noteText.trim();
                      if (!v) return;
                      setNoteText("");
                      updateLead({ addNote: v });
                    }
                  }}
                />

                <button
                  className={btnGhost}
                  onClick={() => {
                    const v = noteText.trim();
                    if (!v) return;
                    setNoteText("");
                    updateLead({ addNote: v });
                  }}
                >
                  Add
                </button>
              </div>

              <div className="h-4" />

              <div className="text-sm font-semibold text-gray-900 mb-2">
                Activity Timeline
              </div>
              <div className="space-y-2">
                {(selected.activities || [])
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((a, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm"
                    >
                      <div className="text-gray-900 font-semibold">{a.type}</div>
                      <div className="text-gray-700">{a.note || "—"}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {fmt(a.createdAt)}
                      </div>
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
              <button className={btnGhost} onClick={closeAdd}>
                Close
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <input
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Business Name</label>
                <input
                  className={input}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input
                  className={input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03xx..."
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input
                  className={input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@..."
                />
              </div>

              {/* ✅ Multi-assign in modal (admin only) */}
              {isAdmin && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">
                    Assign to (multiple active users)
                  </label>

                  <div className="max-h-40 overflow-y-auto rounded-xl border border-black/10 bg-black/5 p-3 space-y-2">
                    {users.map((u) => {
                      const has = assignedToIds.includes(u._id);
                      return (
                        <label
                          key={u._id}
                          className="flex items-center gap-2 text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={has}
                            onChange={(e) => {
                              setAssignedToIds((prev) =>
                                e.target.checked
                                  ? Array.from(new Set([...prev, u._id]))
                                  : prev.filter((id) => id !== u._id)
                              );
                            }}
                          />
                          <span>{u.name || u.email}</span>
                        </label>
                      );
                    })}
                    {users.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No active users
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className={btnGhost} onClick={closeAdd}>
                Cancel
              </button>
              <button className={btn} onClick={createLead}>
                Create Lead
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Timestamp auto create hota hai. Source MANUAL auto set hota hai.
              Status default NEW.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
