"use client";

import Loader from "@/app/components/Loader";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";

type Assignee = { _id: string; name?: string; email: string };

type Lead = {
  _id: string;
  leadId7?: string;
  name: string;
  source: "MANUAL" | "META";
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "LOST";
  assignedToIds?: Assignee[];
  nextFollowUpAt?: string | null;
  followUpType?: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL";
  createdAt?: string;
};

const shell = "max-w-7xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200";
const input =
  "w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200";

function fmtDT(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "—";
  }
}

function assigneeLabel(arr?: Assignee[]) {
  const list = arr || [];
  if (list.length === 0) return "Unassigned";
  if (list.length === 1) return list[0].name || list[0].email;
  const first = list[0].name || list[0].email;
  return `${first} +${list.length - 1}`;
}

function typeBadge(type?: Lead["followUpType"]) {
  const t = type || "CALL";
  const base = "text-xs px-2 py-1 rounded-full border inline-flex";
  if (t === "WHATSAPP") return base + " bg-green-600/10 border-green-600/20 text-green-800";
  if (t === "EMAIL") return base + " bg-indigo-600/10 border-indigo-600/20 text-indigo-800";
  if (t === "MEETING") return base + " bg-purple-600/10 border-purple-600/20 text-purple-800";
  return base + " bg-blue-600/10 border-blue-600/20 text-blue-800";
}

// simple debounce hook
function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function FollowUpsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  const [status, setStatus] = useState<
    "ALL" | "NEW" | "CONTACTED" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "LOST"
  >("ALL");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  async function load() {
    setLoading(true);

    // ✅ IMPORTANT: fetch ALL permitted leads once,
    // then do professional fuzzy search/filter client-side
    const res = await fetch(`/api/crm/followups`, {
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    const leads: Lead[] = res?.leads || [];

    // ✅ sort: followup first then created
    leads.sort((a, b) => {
      const af = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : 0;
      const bf = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : 0;
      if (bf !== af) return bf - af;

      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bc - ac;
    });

    setAllLeads(leads);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ Fuse instance (typo tolerant)
  const fuse = useMemo(() => {
    return new Fuse(allLeads, {
      includeScore: true,
      threshold: 0.35, // lower => strict, higher => more fuzzy
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "name", weight: 0.7 },
        { name: "leadId7", weight: 0.3 },
      ],
    });
  }, [allLeads]);

  // ✅ Apply filter + fuzzy search
  const filtered = useMemo(() => {
    let list = allLeads;

    // status filter
    if (status !== "ALL") {
      list = list.filter((x) => x.status === status);
    }

    const q = debouncedSearch.trim();
    if (!q) return list;

    // fuzzy results on CURRENT list (status filtered)
    const localFuse = new Fuse(list, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "name", weight: 0.7 },
        { name: "leadId7", weight: 0.3 },
      ],
    });

    return localFuse.search(q).map((r) => r.item);
  }, [allLeads, status, debouncedSearch]);

  const total = filtered.length;

  if (loading) {
    return (
      <Loader
        title="Follow Ups"
        subtitle="Loading..."
        variant="page"
        showStats
        rightPanel={false}
        rows={7}
      />
    );
  }

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-2xl font-bold text-gray-900">Follow Ups</div>
          <div className="text-gray-500 text-sm">
            Showing: <span className="font-semibold text-gray-900">{total}</span>
          </div>
        </div>

        <button
          className="rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
<div className={card + " mb-4"}>
  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
    {/* Status */}
    <div className="md:col-span-4">
      <label className="text-xs font-medium text-gray-600 block mb-1">
        Filter by Status
      </label>

      <select
        className={
          "w-full h-11 rounded-xl border border-black/10 px-3 outline-none " +
          "focus:ring-2 focus:ring-blue-200 bg-white"
        }
        value={status}
        onChange={(e) => setStatus(e.target.value as any)}
      >
        <option value="ALL">ALL</option>
        <option value="NEW">NEW</option>
        <option value="CONTACTED">CONTACTED</option>
        <option value="FOLLOW_UP">FOLLOW_UP</option>
        <option value="INTERESTED">INTERESTED</option>
        <option value="CONVERTED">CONVERTED</option>
        <option value="LOST">LOST</option>
      </select>
    </div>

    {/* Search */}
    <div className="md:col-span-6">
      <label className="text-xs font-medium text-gray-600 block mb-1">
        Search (Name or ID)
      </label>

      <input
        className={
          "w-full h-11 rounded-xl border border-black/10 px-3 outline-none " +
          "focus:ring-2 focus:ring-blue-200"
        }
        placeholder="Search by name or 7-digit ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* Reset */}
    <div className="md:col-span-2 flex md:justify-end">
      <button
        className="h-11 w-full md:w-auto rounded-xl px-5 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
        onClick={() => {
          setSearch("");
          setStatus("ALL");
        }}
      >
        Reset
      </button>
    </div>
  </div>

  
</div>


      {/* Table */}
      <div className={card}>
        {filtered.length === 0 ? (
          // ✅ Professional Not Found
          <div className="py-10 text-center">
            <div className="text-lg font-semibold text-gray-900">Not found</div>
            <div className="text-gray-500 text-sm mt-1">
              No leads matched your search/filter. Try different spelling or clear filters.
            </div>
            <button
              className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5 transition"
              onClick={() => {
                setSearch("");
                setStatus("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b border-black/10">
                <tr>
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Source</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Assigned</th>
                  <th className="py-2 text-left">Follow Up</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l._id}
                    onClick={() => router.push(`/crm/followups/${l._id}`)}
                    className="border-b border-black/5 cursor-pointer hover:bg-black/5 transition"
                  >
                    <td className="py-3 font-mono text-gray-700">{l.leadId7 || "—"}</td>
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
                    <td className="py-3 text-gray-700">{assigneeLabel(l.assignedToIds)}</td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className={typeBadge(l.followUpType)}>{l.followUpType || "CALL"}</span>
                        <span className="text-xs text-gray-600">{fmtDT(l.nextFollowUpAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs text-gray-500 mt-3">
              Click a row to open full details & edit.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
