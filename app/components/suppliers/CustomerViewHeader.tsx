"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerViewHeader({ current }: { current: any }) {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // small list for dropdown (you can build dedicated endpoint later)
        const res = await fetch(`/api/erp/suppliers?page=1&limit=100`);
        const data = await res.json();
        setList(data.rows || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-lg font-semibold text-slate-900">View Contact</div>
        <div className="text-sm text-slate-500 mt-0.5">
          {current?.contactId} — {current?.businessName || current?.name}
        </div>
      </div>

      <div className="w-full max-w-[320px]">
        <div className="text-xs mb-1 text-slate-500">Quick switch customer</div>
        <select
          className={selectBase}
          disabled={loading}
          value={current?._id}
          onChange={(e) => router.push(`/erp/suppliers/${e.target.value}`)}
        >
          {list.map((c) => (
            <option key={c._id} value={c._id}>
              {(c.businessName || c.name) ?? c.contactId}
            </option>
          ))}
        </select>

        {loading && <div className="text-xs text-slate-400 mt-1">Loading customers…</div>}
      </div>
    </div>
  );
}