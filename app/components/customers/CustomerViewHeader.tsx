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
        const res = await fetch(`/api/erp/customers?page=1&limit=100`);
        const data = await res.json();
        setList(data.rows || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-lg font-semibold">
          View Contact
        </div>
        <div className="text-sm text-gray-500">
          {current?.contactId} — {current?.businessName || current?.name}
        </div>
      </div>

      <div className="min-w-[260px]">
        <div className="text-xs mb-1 text-gray-500">Quick switch customer</div>
        <select
          className="w-full border rounded px-2 py-2"
          disabled={loading}
          value={current?._id}
          onChange={(e) => router.push(`/erp/customers/${e.target.value}`)}
        >
          {list.map((c) => (
            <option key={c._id} value={c._id}>
              {(c.businessName || c.name) ?? c.contactId}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}