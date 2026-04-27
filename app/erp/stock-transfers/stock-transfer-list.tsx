"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  _id: string;
  transferDate?: string | Date;
  referenceNo?: string;
  fromLocationName?: string;
  toLocationName?: string;
  status?: string;
  shippingCharges?: number;
  subtotal?: number;
  grandTotal?: number;
  createdAt?: string | Date;
  addedByName?: string;
};

type LocationRow = { _id: string; name: string };

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtPK(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}
function badge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (s === "IN_TRANSIT") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

type ColKey =
  | "transferDate"
  | "referenceNo"
  | "fromLocation"
  | "toLocation"
  | "status"
  | "shippingCharges"
  | "subtotal"
  | "grandTotal"
  | "addedBy"
  | "createdAt";

const DEFAULT_COLS: Record<ColKey, boolean> = {
  transferDate: true,
  referenceNo: true,
  fromLocation: true,
  toLocation: true,
  status: true,
  shippingCharges: true,
  subtotal: true,
  grandTotal: true,
  addedBy: true,
  createdAt: true,
};

export default function StockTransferList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<{ grandTotal: number }>({ grandTotal: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const [can, setCan] = useState<{ admin: boolean; update: boolean; delete: boolean }>({
    admin: false,
    update: false,
    delete: false,
  });
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState("");

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  const visibleCols = Object.entries(cols).filter(([, v]) => v).length;

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/erp/locations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setLocations(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setLocations([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());
      if (status) sp.set("status", status);
      if (fromLocationId) sp.set("fromLocationId", fromLocationId);
      if (toLocationId) sp.set("toLocationId", toLocationId);

      const res = await fetch(`/api/erp/stock-transfers?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
      setTotals({ grandTotal: money(data.totals?.grandTotal) });
      setCan({
        admin: Boolean(data.can?.admin),
        update: Boolean(data.can?.update),
        delete: Boolean(data.can?.delete),
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, status, fromLocationId, toLocationId]);

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(t);
  }, [q, status, fromLocationId, toLocationId, load]);

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (colsOpen && !target.closest("[data-action-anchor]")) setColsOpen(false);
      if (actionOpenId && !target.closest("[data-action-anchor]")) setActionOpenId(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setColsOpen(false);
        setActionOpenId(null);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colsOpen, actionOpenId]);

  function toggleCol(k: ColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  async function deletePending(id: string) {
    if (!confirm("Delete this pending stock transfer?")) return;
    const res = await fetch(`/api/erp/stock-transfers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed to delete");
    load();
  }

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  return (
    <div className="p-6 relative w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #stock-transfer-print, #stock-transfer-print * { visibility: visible !important; }
          #stock-transfer-print { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          .no-print { display: none !important; visibility: hidden !important; }
          table { 
            border-collapse: collapse !important; 
            width: 100% !important;
            min-width: auto !important;
            table-layout: auto !important;
          }
          th, td { 
            border: 1px solid #ddd !important; 
            font-size: 10px !important;
            padding: 4px !important;
            white-space: nowrap !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Stock Transfers</div>
            <div className="text-sm text-slate-500">Track stock movement between locations.</div>
          </div>
          <a className={primaryBtn} href="/erp/stock-transfers/new">
            + Add Stock Transfer
          </a>
        </div>

        <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Search</div>
              <input className={inputBase} placeholder="Search by ref..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Status</div>
              <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">From Location</div>
              <select className={inputBase} value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}>
                <option value="">All</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">To Location</div>
              <select className={inputBase} value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                <option value="">All</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Rows</div>
              <select className={inputBase} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="no-print flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap text-sm text-slate-600">
            <button className={pillBtn} onClick={onPrint}>Print</button>
          
          </div>
          <div className="text-sm text-slate-500">Total: {total}</div>
        </div>

        <div id="stock-transfer-print" className="mt-2">
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Stock Transfers</div>
            <div className="text-sm">Total records: {total}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-visible">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
                  {cols.transferDate && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>}
                  {cols.referenceNo && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference No</th>}
                  {cols.fromLocation && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">From</th>}
                  {cols.toLocation && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">To</th>}
                  {cols.status && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>}
                  {cols.shippingCharges && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Shipping</th>}
                  {cols.subtotal && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Subtotal</th>}
                  {cols.grandTotal && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</th>}
                  {cols.addedBy && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Added By</th>}
                  {cols.createdAt && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Created At</th>}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCols + 1}>Loading...</td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 no-print">
                        <div className="relative inline-block" data-action-anchor>
                          <button
                            className="text-xs border border-slate-300 text-slate-600 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
                            onClick={() => setActionOpenId(actionOpenId === r._id ? null : r._id)}
                          >
                            Actions ▾
                          </button>
                          {actionOpenId === r._id && (
                            <div className="absolute z-50 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 right-0">
                              <button
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-gray-700"
                                onClick={() => {
                                  setActionOpenId(null);
                                  window.location.href = `/erp/stock-transfers/${r._id}`;
                                }}
                              >
                                View
                              </button>
                              {can.update && r.status !== "COMPLETED" && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                                  onClick={() => {
                                    setActionOpenId(null);
                                    window.location.href = `/erp/stock-transfers/new?id=${r._id}`;
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                              {can.delete && r.status === "PENDING" && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-rose-700"
                                  onClick={() => {
                                    setActionOpenId(null);
                                    deletePending(r._id);
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {cols.transferDate && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.transferDate)}</td>}
                      {cols.referenceNo && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.referenceNo}</td>}
                      {cols.fromLocation && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.fromLocationName || "-"}</td>}
                      {cols.toLocation && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.toLocationName || "-"}</td>}
                      {cols.status && (
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      )}
                      {cols.shippingCharges && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.shippingCharges)}</td>}
                      {cols.subtotal && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.subtotal)}</td>}
                      {cols.grandTotal && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.grandTotal)}</td>}
                      {cols.addedBy && <td className="px-4 py-3 text-slate-700 whitespace-nowrap no-print">{r.addedByName || "-"}</td>}
                      {cols.createdAt && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.createdAt)}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCols + 1}>No stock transfers found</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={Math.max(1, visibleCols - 1)}>
                    Total Amount:
                  </td>
                  {cols.grandTotal ? (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap" colSpan={Math.max(1, 1)}>
                      Rs. {money(totals.grandTotal)}
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-sm no-print">
          <button
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
      </div>
    </div>
  );
}
