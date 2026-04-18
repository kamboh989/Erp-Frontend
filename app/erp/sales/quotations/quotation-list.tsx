"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Row = any;
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
  if (s === "SENT") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "EXPIRED") return "border-gray-200 bg-gray-50 text-gray-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function QuotationList() {
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<{ grandTotal: number }>({ grandTotal: 0 });
  const [can, setCan] = useState<{ admin: boolean; update: boolean; delete: boolean }>({
    admin: false,
    update: false,
    delete: false,
  });

  const [loading, setLoading] = useState(false);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);

  const [colsOpen, setColsOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement | null>(null);
  type ColKey = "quotationDate" | "expiryDate" | "referenceNo" | "customer" | "location" | "status" | "grandTotal" | "addedBy" | "createdAt";
  const [cols, setCols] = useState<Record<ColKey, boolean>>({
    quotationDate: true,
    expiryDate: true,
    referenceNo: true,
    customer: true,
    location: true,
    status: true,
    grandTotal: true,
    addedBy: true,
    createdAt: true,
  });

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  const exportCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    if (locationId) sp.set("locationId", locationId);
    if (customerId) sp.set("customerId", customerId);
    return `/api/erp/quotations/export/csv?${sp.toString()}`;
  }, [q, status, locationId, customerId]);

  const exportExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    if (locationId) sp.set("locationId", locationId);
    if (customerId) sp.set("customerId", customerId);
    return `/api/erp/quotations/export/excel?${sp.toString()}`;
  }, [q, status, locationId, customerId]);

  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
  }, []);

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  function toggleCol(k: ColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  async function loadLocations() {
    try {
      const res = await fetch("/api/erp/locations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setLocations(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setLocations([]);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());
      if (status) sp.set("status", status);
      if (locationId) sp.set("locationId", locationId);
      if (customerId) sp.set("customerId", customerId);

      const res = await fetch(`/api/erp/quotations?${sp.toString()}`, { cache: "no-store" });
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
  }

  async function deleteDraft(id: string) {
    if (!can.delete) return alert("Not allowed");
    if (!confirm("Delete this DRAFT quotation?")) return;

    const res = await fetch(`/api/erp/quotations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");
    load();
  }

  useEffect(() => {
    const cid = searchParams?.get("customerId") || "";
    setCustomerId(cid);
    loadLocations();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, customerId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
  }, [q, status, locationId]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (colsOpen) {
        const el = colsMenuRef.current;
        if (!el || !target.closest("[data-action-anchor]") && !el.contains(target)) {
          setColsOpen(false);
        }
      }
      if (actionOpenId && !target.closest("[data-action-anchor]")) {
        setActionOpenId(null);
      }
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

  const visibleCols = Object.entries(cols).filter(([, v]) => v).length;

  return (
    <div className="p-6 relative w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #quotations-print, #quotations-print * { visibility: visible !important; }
          #quotations-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Quotations</div>
            <div className="text-sm text-slate-500">Manage your sales quotations</div>
          </div>

          <a className={primaryBtn} href="/erp/sales/quotations/new">
            + Add Quotation
          </a>
        </div>

        <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Search</div>
              <input className={inputBase} placeholder="Search by ref / customer..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Status</div>
              <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Location</div>
              <select className={inputBase} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">All</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Show</div>
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
            <a className={pillBtn} href={exportCsvUrl} target="_blank" rel="noreferrer">Export CSV</a>
            <a className={pillBtn} href={exportExcelUrl} target="_blank" rel="noreferrer">Export Excel</a>
            <button className={pillBtn} onClick={onExportPdf}>Export PDF</button>
            <button className={pillBtn} onClick={onPrint}>Print</button>

            <div className="relative" ref={colsMenuRef}>
              <button className={pillBtn} onClick={() => setColsOpen((s) => !s)}>
                Column visibility ▾
              </button>

              {colsOpen && (
                <div className="absolute left-0 z-50 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3">
                  {(
                    [
                      ["quotationDate", "Date"],
                      ["expiryDate", "Expiry Date"],
                      ["referenceNo", "Reference No"],
                      ["customer", "Customer"],
                      ["location", "Location"],
                      ["status", "Status"],
                      ["grandTotal", "Grand Total"],
                      ["addedBy", "Added By"],
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
                    <button className={pillBtn} onClick={() => setCols({
                      quotationDate: true,
                      expiryDate: true,
                      referenceNo: true,
                      customer: true,
                      location: true,
                      status: true,
                      grandTotal: true,
                      addedBy: true,
                      createdAt: true,
                    })}>
                      Reset
                    </button>
                    <button className={pillBtn} onClick={() => setColsOpen(false)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-slate-500">Total: {total}</div>
        </div>

        <div id="quotations-print" className="mt-2">
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Quotations</div>
            <div className="text-sm">Total records: {total}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
                  {cols.quotationDate && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>}
                  {cols.expiryDate && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Expiry</th>}
                  {cols.referenceNo && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference No</th>}
                  {cols.customer && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>}
                  {cols.location && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</th>}
                  {cols.status && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>}
                  {cols.grandTotal && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Grand Total</th>}
                  {cols.addedBy && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Added By</th>}
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
                            className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
                            onClick={() => setActionOpenId(actionOpenId === r._id ? null : r._id)}
                          >
                            Actions ▾
                          </button>

                          {actionOpenId === r._id && (
                            <div className="absolute z-50 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                              <button
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                                onClick={() => {
                                  setActionOpenId(null);
                                  window.location.href = `/erp/sales/quotations/${r._id}`;
                                }}
                              >
                                View
                              </button>

                              <button
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                                onClick={() => {
                                  setActionOpenId(null);
                                  window.location.href = `/erp/sales/quotations/new?id=${r._id}`;
                                }}
                              >
                                Edit
                              </button>

                              {can.delete ? (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-rose-700"
                                  onClick={() => {
                                    setActionOpenId(null);
                                    deleteDraft(r._id);
                                  }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </td>

                      {cols.quotationDate && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.quotationDate)}</td>}
                      {cols.expiryDate && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.expiryDate)}</td>}
                      {cols.referenceNo && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.referenceNo}</td>}
                      {cols.customer && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.customerNameSnapshot || "-"}</td>}
                      {cols.location && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.locationName || "-"}</td>}
                      {cols.status && (
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      )}
                      {cols.grandTotal && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.grandTotal)}</td>}
                      {cols.addedBy && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.addedByName || "-"}</td>}
                      {cols.createdAt && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.createdAt)}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={visibleCols + 1}>No data available</td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={Math.max(1, visibleCols - 1)}>
                    Total Grand Total:
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
      </div>
    </div>
  );
}
