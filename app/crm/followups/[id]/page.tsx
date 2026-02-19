"use client";

import Loader from "@/app/components/Loader";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Assignee = { _id: string; name?: string; email: string; role?: string; isActive?: boolean };

type Lead = {
  _id: string;
  leadId7?: string;

  name: string;
  phone?: string;
  email?: string;
  businessName?: string;

  source: "MANUAL" | "META";
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "LOST";

  assignedToIds?: Assignee[];

  createdAt: string;

  nextFollowUpAt?: string | null;
  followUpType?: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL";
  followUpNote?: string;

  activities?: { type: string; note?: string; createdAt: string }[];
};

type User = { _id: string; name?: string; email: string };

const shell = "max-w-5xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "—";
  }
}

function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function FollowUpLeadDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // local inputs
  const [followUpType, setFollowUpType] = useState<"CALL" | "MEETING" | "WHATSAPP" | "EMAIL">("CALL");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [noteText, setNoteText] = useState("");

  const isAdmin = useMemo(
    () => Boolean(session?.isOwner) || session?.role === "ADMIN",
    [session]
  );
  const isOwner = useMemo(() => Boolean(session?.isOwner), [session]);

  async function load() {
    setLoading(true);

    const me = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    setSession(me?.session || null);

    const j = await fetch(`/api/crm/leads/${id}`, {
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    setLead(j?.lead || null);

    // users list only admin/owner (for multi-assign)
    if (Boolean(me?.session?.isOwner) || me?.session?.role === "ADMIN") {
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
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // sync follow-up local inputs when lead changes
  useEffect(() => {
    if (!lead) return;
    setFollowUpType((lead.followUpType as any) || "CALL");
    setNextFollowUpAt(toDatetimeLocalValue(lead.nextFollowUpAt || null));
    setFollowUpNote(lead.followUpNote || "");
  }, [lead]);

  async function updateLead(patch: any) {
    if (!lead) return;

    const r = await fetch(`/api/crm/leads/${lead._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Update failed");

    setLead(j.lead as Lead);
  }

  async function deleteLead() {
    if (!lead) return;
    if (!isOwner) return;

    const ok = confirm("Delete this lead? (Permanent delete)");
    if (!ok) return;

    const r = await fetch(`/api/crm/leads/${lead._id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Delete failed");

    router.push("/crm/followups");
  }

  if (loading) {
    return (
      <Loader
        title="Follow-up Details"
        subtitle="Loading lead..."
        variant="page"
        showStats={false}
        rightPanel={false}
        rows={10}
      />
    );
  }

  if (!lead) {
    return (
      <div className={shell}>
        <div className={card}>
          <div className="text-gray-900 font-semibold">Not found</div>
          <div className="text-gray-500 text-sm mt-1">
            This lead may not exist or you don’t have access.
          </div>
          <button
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
            onClick={() => router.push("/crm/followups")}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-2xl font-bold text-gray-900">Lead Details</div>
          <div className="text-gray-500 text-sm">
            ID: <span className="font-mono text-gray-900">{lead.leadId7 || "—"}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
            onClick={() => router.push("/crm/followups")}
          >
            Back
          </button>

          {isOwner && (
            <button
              className="rounded-xl px-3 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
              title="Delete Lead"
              onClick={deleteLead}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div className={card}>
        {/* Basic info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input
              className={input}
              value={lead.name || ""}
              onChange={(e) => setLead((p) => (p ? { ...p, name: e.target.value } : p))}
              onBlur={() => updateLead({ name: lead.name })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Business</label>
            <input
              className={input}
              value={lead.businessName || ""}
              onChange={(e) =>
                setLead((p) => (p ? { ...p, businessName: e.target.value } : p))
              }
              onBlur={() => updateLead({ businessName: lead.businessName })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Phone</label>
            <input
              className={input}
              value={lead.phone || ""}
              onChange={(e) => setLead((p) => (p ? { ...p, phone: e.target.value } : p))}
              onBlur={() => updateLead({ phone: lead.phone })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              className={input}
              value={lead.email || ""}
              onChange={(e) => setLead((p) => (p ? { ...p, email: e.target.value } : p))}
              onBlur={() => updateLead({ email: lead.email })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Source</label>
            <input className={input} value={lead.source} readOnly />
          </div>

          <div>
            <label className="text-sm text-gray-600">Created</label>
            <input className={input} value={fmt(lead.createdAt)} readOnly />
          </div>
        </div>

        <div className="h-5" />

        {/* Status */}
        <div>
          <label className="text-sm text-gray-600">Status</label>
          <select
            className={input}
            value={lead.status}
            onChange={(e) => updateLead({ status: e.target.value })}
          >
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="FOLLOW_UP">FOLLOW_UP</option>
            <option value="INTERESTED">INTERESTED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="LOST">LOST</option>
          </select>
        </div>

        {/* Multi-assign (admin/owner) */}
        {isAdmin && (
          <>
            <div className="h-5" />
            <div className="text-sm text-gray-600 mb-2">Assign to (multiple)</div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-black/10 bg-black/5 p-3 space-y-2">
              {users.map((u) => {
                const has = (lead.assignedToIds || []).some((x) => x._id === u._id);

                return (
                  <label key={u._id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={has}
                      onChange={(e) => {
                        const current = (lead.assignedToIds || []).map((x) => x._id);

                        const next = e.target.checked
                          ? Array.from(new Set([...current, u._id]))
                          : current.filter((x) => x !== u._id);

                        updateLead({ assignedToIds: next });
                      }}
                    />
                    <span>{u.name || u.email}</span>
                  </label>
                );
              })}
              {users.length === 0 && (
                <div className="text-sm text-gray-500">No active users</div>
              )}
            </div>
          </>
        )}

        <div className="h-6" />

        {/* Follow-up */}
        <div className="text-sm font-semibold text-gray-900 mb-2">Follow-up</div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
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
          </div>

          <div>
            <label className="text-sm text-gray-600">Next Follow-up Time</label>
            <input
              className={input}
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => {
                const v = e.target.value;
                setNextFollowUpAt(v);
                updateLead({
                  followUp: { nextFollowUpAt: v ? new Date(v).toISOString() : null },
                });
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Follow-up Note</label>
            <input
              className={input}
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              onBlur={() => updateLead({ followUp: { followUpNote } })}
              placeholder="e.g. Call after 6pm"
            />
          </div>
        </div>

        <div className="h-6" />

        {/* Add note activity */}
        <div className="text-sm font-semibold text-gray-900 mb-2">Add Activity Note</div>
        <div className="flex gap-2">
          <input
            className={input}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Called client, no answer"
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
            className="rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
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

        <div className="h-6" />

        {/* Timeline */}
        <div className="text-sm font-semibold text-gray-900 mb-2">Activity Timeline</div>
        <div className="space-y-2">
          {(lead.activities || [])
            .slice()
            .reverse()
            .slice(0, 12)
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

          {(lead.activities || []).length === 0 && (
            <div className="text-gray-500 text-sm">No activity yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
