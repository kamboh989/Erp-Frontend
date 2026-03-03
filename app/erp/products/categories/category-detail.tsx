"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Row = any;

function fmtDate(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

type ColKey = "name" | "code" | "description" | "createdAt";

export default function CategoriesPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  // columns popover
  const [colsOpen, setColsOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement | null>(null);

  const [cols, setCols] = useState<Record<ColKey, boolean>>({
    name: true,
    code: true,
    description: true,
    createdAt: false,
  });

  const exportCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/categories/export/csv?${sp.toString()}`;
  }, [q]);

  const exportExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/categories/export/excel?${sp.toString()}`;
  }, [q]);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  const visibleCount = 1 + (Object.keys(cols) as ColKey[]).filter((k) => cols[k]).length; // Action + visible cols

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());

      const res = await fetch(`/api/erp/categories?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!colsOpen) return;
      const el = colsMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setColsOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setColsOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colsOpen]);

  // print/pdf
  const [printedAt, setPrintedAt] = useState("");
  useEffect(() => setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })), []);
  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }
  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete category?")) return;
    const res = await fetch(`/api/erp/categories/${id}`, { method: "DELETE" });
    if (!res.ok) alert("Failed to delete");
    load();
  }

  function toggleCol(k: ColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  return (
    <div className="p-6 relative w-full">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cats-print,
          #cats-print * {
            visibility: visible !important;
          }
          #cats-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th,
          td {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>

      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Categories</div>
            <div className="text-sm text-slate-500">Manage your categories</div>
          </div>

          <button
            className={primaryBtn}
            onClick={() => {
              setEditRow(null);
              setOpen(true);
            }}
          >
            + Add
          </button>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2 text-sm flex-wrap text-slate-600">
            <span>Show</span>
            <select className={inputBase} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>entries</span>

            <a className={"ml-2 " + pillBtn} href={exportCsvUrl} target="_blank" rel="noreferrer">
              Export CSV
            </a>
            <a className={pillBtn} href={exportExcelUrl} target="_blank" rel="noreferrer">
              Export Excel
            </a>
            <button className={pillBtn} onClick={onExportPdf}>
              Export PDF
            </button>
            <button className={pillBtn} onClick={onPrint}>
              Print
            </button>

            <div className="relative" ref={colsMenuRef}>
              <button className={pillBtn} onClick={() => setColsOpen((s) => !s)}>
                Column visibility ▾
              </button>

              {colsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3">
                  {(
                    [
                      ["name", "Category"],
                      ["code", "Category Code"],
                      ["description", "Description"],
                      ["createdAt", "Created At"],
                    ] as Array<[ColKey, string]>
                  ).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm py-1.5 text-slate-700">
                      <input
                        type="checkbox"
                        checked={cols[k]}
                        onChange={() => toggleCol(k)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                      />
                      {label}
                    </label>
                  ))}
                  <div className="pt-3 flex gap-2">
                    <button
                      className={pillBtn}
                      onClick={() => setCols({ name: true, code: true, description: true, createdAt: false })}
                    >
                      Reset
                    </button>
                    <button className={pillBtn} onClick={() => setColsOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <input className={"w-48 md:w-56 lg:w-64 " + inputBase} placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* PRINT AREA */}
        <div id="cats-print" className="mt-6">
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Categories</div>
            <div className="text-sm">Total records: {total}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-full w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
                  {cols.name && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>}
                  {cols.code && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Category Code</th>}
                  {cols.description && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>}
                  {cols.createdAt && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Created At</th>}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCount}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 no-print">
                        <div className="flex gap-2">
                          <button
                            className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
                            onClick={() => {
                              setEditRow(r);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs border border-rose-200 text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 hover:bg-rose-100"
                            onClick={() => onDelete(r._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                      {cols.name && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.name}</td>}
                      {cols.code && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.code || "-"}</td>}
                      {cols.description && <td className="px-4 py-3 text-slate-700">{r.description || "-"}</td>}
                      {cols.createdAt && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(r.createdAt)}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCount}>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-end gap-2 text-sm no-print">
          <button
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <div className="px-2 text-sm text-slate-600">Page {page}</div>
          <button
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>

        {/* Modal */}
        {open && (
          <CategoryModal
            initial={editRow}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CategoryModal({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [code, setCode] = useState(initial?.code || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  async function save() {
    setSaving(true);
    setErr("");
    const payload = { name, code, description };

    try {
      const res = await fetch(initial?._id ? `/api/erp/categories/${initial._id}` : "/api/erp/categories", {
        method: initial?._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: any = {
          NAME_REQUIRED: "Category name is required",
          CATEGORY_ALREADY_EXISTS: "Category already exists",
          NOT_FOUND: "Category not found",
        };
        setErr(map[data?.error] || data?.error || "Failed");
        return;
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // close when clicking overlay
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-900">{initial?._id ? "Edit Category" : "Add Category"}</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}

          <div>
            <div className="text-xs mb-1 text-slate-500">Category *</div>
            <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electronics" />
          </div>

          <div>
            <div className="text-xs mb-1 text-slate-500">Category Code</div>
            <input className={inputBase} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ELEC" />
          </div>

          <div>
            <div className="text-xs mb-1 text-slate-500">Description</div>
            <input className={inputBase} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-xl px-4 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}