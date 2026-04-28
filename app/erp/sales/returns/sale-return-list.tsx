"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SaleReturnRow = {
  _id: string;
  returnDate?: string | Date;
  referenceNo?: string;
  customerNameSnapshot?: string;
  locationName?: string;
  status?: string;
  paymentStatus?: string;
  paidAmount?: number;
  dueAmount?: number;
  grandTotal?: number;
  createdAt?: string | Date;
  addedByName?: string;
};

function toNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function money(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-PK") : "0";
}
function fmtPK(v: string | Date | number | undefined | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}
function statusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "FINAL")     return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function paymentBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID")    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

type ColKey =
  | "returnDate"
  | "referenceNo"
  | "customer"
  | "location"
  | "status"
  | "paymentStatus"
  | "paidAmount"
  | "dueAmount"
  | "grandTotal"
  | "addedBy"
  | "createdAt";

const DEFAULT_COLS: Record<ColKey, boolean> = {
  returnDate:    true,
  referenceNo:   true,
  customer:      true,
  location:      true,
  status:        true,
  paymentStatus: true,
  paidAmount:    true,
  dueAmount:     true,
  grandTotal:    true,
  addedBy:       true,
  createdAt:     true,
};

export default function SaleReturnList() {
  const [rows, setRows]                   = useState<SaleReturnRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [total, setTotal]                 = useState(0);
  const [totals, setTotals]               = useState<{ grandTotal: number }>({ grandTotal: 0 });
  const [page, setPage]                   = useState(1);
  const [limit, setLimit]                 = useState(25);
  const [q, setQ]                         = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");

  const [can, setCan] = useState<{
    admin: boolean;
    update: boolean;
    delete: boolean;
    cancel: boolean;
  }>({ admin: false, update: false, delete: false, cancel: false });

  const [cols, setCols]               = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [colsOpen, setColsOpen]       = useState(false);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);
  const [printedAt, setPrintedAt]     = useState("");

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  // ── export URLs ──
  const exportCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim())             sp.set("q",             q.trim());
    if (statusFilter)         sp.set("status",         statusFilter);
    if (paymentStatusFilter)  sp.set("paymentStatus",  paymentStatusFilter);
    if (locationFilter)       sp.set("locationId",     locationFilter);
    if (customerFilter)       sp.set("customerId",     customerFilter);
    return `/api/erp/sale-returns/export/csv?${sp.toString()}`;
  }, [q, statusFilter, paymentStatusFilter, locationFilter, customerFilter]);

  const exportExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim())             sp.set("q",             q.trim());
    if (statusFilter)         sp.set("status",         statusFilter);
    if (paymentStatusFilter)  sp.set("paymentStatus",  paymentStatusFilter);
    if (locationFilter)       sp.set("locationId",     locationFilter);
    if (customerFilter)       sp.set("customerId",     customerFilter);
    return `/api/erp/sale-returns/export/excel?${sp.toString()}`;
  }, [q, statusFilter, paymentStatusFilter, locationFilter, customerFilter]);

  // ── load ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page",  String(page));
      sp.set("limit", String(limit));
      if (q.trim())             sp.set("q",             q.trim());
      if (statusFilter)         sp.set("status",         statusFilter);
      if (paymentStatusFilter)  sp.set("paymentStatus",  paymentStatusFilter);
      if (locationFilter)       sp.set("locationId",     locationFilter);
      if (customerFilter)       sp.set("customerId",     customerFilter);

      const res  = await fetch(`/api/erp/sale-returns?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(toNumber(data.total));
      setTotals({ grandTotal: toNumber(data.totals?.grandTotal) });
      setCan({
        admin:  Boolean(data.can?.admin),
        update: Boolean(data.can?.update),
        delete: Boolean(data.can?.delete),
        cancel: Boolean(data.can?.cancel),
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, statusFilter, paymentStatusFilter, locationFilter, customerFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));

    // close dropdowns on outside click / ESC
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (actionOpenId && !t.closest("[data-action-anchor]")) setActionOpenId(null);
      if (colsOpen      && !t.closest("[data-cols-anchor]"))  setColsOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setActionOpenId(null); setColsOpen(false); }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown",   onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown",   onEsc);
    };
  }, [actionOpenId, colsOpen]);

  // ── actions ──
  async function cancelReturn(id: string) {
    if (!can.cancel) return alert("Not allowed");
    if (!confirm("Cancel this FINAL sale return? This will reverse stock + customer refund due.")) return;
    const res  = await fetch(`/api/erp/sale-returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");
    await loadData();
  }

  async function deleteDraft(id: string) {
    if (!can.delete) return alert("Not allowed");
    if (!confirm("Delete this DRAFT sale return?")) return;
    const res  = await fetch(`/api/erp/sale-returns/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");
    await loadData();
  }

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  function toggleCol(k: ColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  const visibleCols  = (Object.keys(cols) as ColKey[]).filter((k) => cols[k]);
  const totalPages   = Math.ceil(total / limit);

  const COL_LABELS: Array<[ColKey, string]> = [
    ["returnDate",    "Return Date"],
    ["referenceNo",   "Reference No"],
    ["customer",      "Customer"],
    ["location",      "Location"],
    ["status",        "Status"],
    ["paymentStatus", "Payment Status"],
    ["paidAmount",    "Paid"],
    ["dueAmount",     "Due"],
    ["grandTotal",    "Grand Total"],
    ["addedBy",       "Added By"],
    ["createdAt",     "Created At"],
  ];

  return (
    <div className="p-6 relative w-full">
      {/* ── Print CSS ── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #sr-print, #sr-print * { visibility: visible !important; }
          #sr-print {
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

      <div className="w-full max-w-5xl space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Sale Returns</div>
            <div className="text-sm text-slate-500">Manage customer returns and refunds.</div>
          </div>
          <a className={primaryBtn} href="/erp/sales/returns/new">+ Add Return</a>
        </div>

        {/* ── Filters ── */}
        <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs mb-1 text-slate-500">Search</div>
              <input
                className={inputBase}
                placeholder="Reference, customer name..."
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
              />
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Status</div>
              <select className={inputBase} value={statusFilter}
                onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Payment Status</div>
              <select className={inputBase} value={paymentStatusFilter}
                onChange={(e) => { setPage(1); setPaymentStatusFilter(e.target.value); }}>
                <option value="">All Payments</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Show</div>
              <select className={inputBase} value={limit}
                onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap text-sm text-slate-600">
            <a className={pillBtn} href={exportCsvUrl}   target="_blank" rel="noreferrer">Export CSV</a>
            <a className={pillBtn} href={exportExcelUrl} target="_blank" rel="noreferrer">Export Excel</a>
            <button className={pillBtn} onClick={onPrint}>Export PDF / Print</button>

            {/* Column visibility */}
            <div className="relative" data-cols-anchor>
              <button className={pillBtn} onClick={() => setColsOpen((s) => !s)}>
                Column Visibility ▾
              </button>
              {colsOpen && (
                <div className="absolute left-0 z-[9999] mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3">
                  <div className="max-h-72 overflow-auto pr-1">
                    {COL_LABELS.map(([k, label]) => (
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
                  </div>
                  <div className="pt-3 flex gap-2">
                    <button className={pillBtn} onClick={() => setCols(DEFAULT_COLS)}>Reset</button>
                    <button className={pillBtn} onClick={() => setColsOpen(false)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-slate-500">Total: {total}</div>
        </div>

        {/* ── Table ── */}
        <div id="sr-print">
          {/* print header */}
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Sale Returns</div>
            <div className="text-sm">Total records: {total}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {/* ✅ Actions FIRST */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">
                      Action
                    </th>
                    {cols.returnDate    && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Return Date</th>}
                    {cols.referenceNo   && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference No</th>}
                    {cols.customer      && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>}
                    {cols.location      && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</th>}
                    {cols.status        && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>}
                    {cols.paymentStatus && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Payment</th>}
                    {cols.paidAmount    && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Paid</th>}
                    {cols.dueAmount     && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Due</th>}
                    {cols.grandTotal    && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Grand Total</th>}
                    {cols.addedBy       && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Added By</th>}
                    {cols.createdAt     && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Created At</th>}
                  </tr>
                </thead>

                <tbody style={{ position: 'relative' }}>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCols.length + 1}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">

                      {/* ✅ Actions cell FIRST */}
                      <td className="px-4 py-3 no-print" style={{ position: 'relative' }}>
                        <div className="relative inline-block" data-action-anchor>
                          <button
                            className="text-xs border border-slate-300 text-slate-600 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
                            onClick={() => setActionOpenId(actionOpenId === r._id ? null : r._id)}
                          >
                            Actions ▾
                          </button>

                          {actionOpenId === r._id && (
                            <div 
                              className="absolute mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2 left-0 top-full"
                              style={{ 
                                zIndex: 10000,
                                minWidth: '200px'
                              }}
                            >
                              {/* View */}
                              <button
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                                onClick={() => {
                                  setActionOpenId(null);
                                  window.location.href = `/erp/sales/returns/${r._id}`;
                                }}
                              >
                                👁 View
                              </button>

                              {/* Edit — only DRAFT */}
                              {can.update && r.status === "DRAFT" && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                                  onClick={() => {
                                    setActionOpenId(null);
                                    window.location.href = `/erp/sales/returns/new?id=${r._id}`;
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                              )}

                              {/* Cancel — only FINAL */}
                              {can.cancel && r.status === "FINAL" && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-50 text-rose-700"
                                  onClick={() => { setActionOpenId(null); cancelReturn(r._id); }}
                                >
                                  ❌ Cancel (Reverse)
                                </button>
                              )}

                              {/* Delete — only DRAFT */}
                              {can.delete && r.status === "DRAFT" && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-50 text-rose-700"
                                  onClick={() => { setActionOpenId(null); deleteDraft(r._id); }}
                                >
                                  🗑 Delete Draft
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {cols.returnDate    && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.returnDate)}</td>}
                      {cols.referenceNo   && <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{r.referenceNo}</td>}
                      {cols.customer      && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.customerNameSnapshot || "-"}</td>}
                      {cols.location      && <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.locationName || "-"}</td>}
                      {cols.status && (
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      )}
                      {cols.paymentStatus && (
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${paymentBadge(r.paymentStatus)}`}>
                            {r.paymentStatus || "UNPAID"}
                          </span>
                        </td>
                      )}
                      {cols.paidAmount  && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.paidAmount)}</td>}
                      {cols.dueAmount   && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.dueAmount)}</td>}
                      {cols.grandTotal  && <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">Rs. {money(r.grandTotal)}</td>}
                      {cols.addedBy     && <td className="px-4 py-3 text-slate-600 whitespace-nowrap no-print">{r.addedByName || "-"}</td>}
                      {cols.createdAt   && <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtPK(r.createdAt)}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-sm text-slate-500 text-center" colSpan={visibleCols.length + 1}>
                      No sale returns found.
                    </td>
                  </tr>
                )}
                </tbody>

                {/* ── Footer totals ── */}
                <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td
                    className="px-4 py-3 font-semibold text-slate-700"
                    colSpan={
                      1 + // Action col
                      visibleCols.filter((k) => !["paidAmount", "dueAmount", "grandTotal"].includes(k)).length
                    }
                  >
                    Grand Total:
                  </td>
                  {cols.paidAmount && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      Rs. {money(rows.reduce((s, r) => s + toNumber(r.paidAmount), 0))}
                    </td>
                  )}
                  {cols.dueAmount && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      Rs. {money(rows.reduce((s, r) => s + toNumber(r.dueAmount), 0))}
                    </td>
                  )}
                  {cols.grandTotal && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      Rs. {money(totals.grandTotal)}
                    </td>
                  )}
                </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between gap-2 text-sm no-print">
          <div className="text-slate-500">
            {total > 0
              ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
              : "No records"}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="px-2 text-slate-600">Page {page} of {Math.max(1, totalPages)}</span>
            <button
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}