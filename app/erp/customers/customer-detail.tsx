"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CustomerFormModal } from "@/app/components/customers/CustomerFormModal";
import { ActionDropdown } from "@/app/components/customers/ActionDropdown";
import { PayModal } from "@/app/components/customers/PayModal";

type ContactRow = any;

type ColKey =
  | "contactId"
  | "name"
  | "email"
  | "mobile"
  | "taxNumber"
  | "creditLimit"
  | "payTerm"
  | "openingBalance"
  | "advanceBalance"
  | "saleDue"
  | "returnDue"
  | "status"
  | "createdAt"; // ✅ NEW

const DEFAULT_COLS: Record<ColKey, boolean> = {
  contactId: true,
  name: true,
  email: true,
  mobile: true,
  taxNumber: true,
  creditLimit: true,
  payTerm: true,
  openingBalance: true,
  advanceBalance: true,
  saleDue: true,
  returnDue: true,
  status: true,
  createdAt: true, // ✅ NEW (default visible)
};

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ✅ NEW: safe date formatter (DB createdAt)
function fmtDate(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(); // ✅ system timezone
}

export default function CustomersPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<any>({});

  const [loading, setLoading] = useState(false);

  // permissions (from API)
  const [canDelete, setCanDelete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [payRow, setPayRow] = useState<any>(null);

  // column visibility
  const [colsOpen, setColsOpen] = useState(false);
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const colsMenuRef = useRef<HTMLDivElement | null>(null);

  // ✅ NEW: printed time state (fix hydration)
  const [printedAt, setPrintedAt] = useState("");

  // top filters state
  const [f, setF] = useState({
    sellDue: false,
    sellReturn: false,
    advanceBalance: false,
    openingBalance: false,
    hasNoSellFrom: "",
    customerGroupId: "",
    assignedTo: "",
    status: "",
  });

  // Assigned-to dropdown users
  const [users, setUsers] = useState<Array<{ _id: string; name: string; role: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ✅ backend urls EXACT
  const exportCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/customers/export/csv?${sp.toString()}`;
  }, [q]);

  const exportExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/customers/export/excel?${sp.toString()}`;
  }, [q]);

  function toggleCol(k: ColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/company/users/active", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setUsers(Array.isArray(data.users) ? data.users : []);
    } finally {
      setUsersLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());

      if (f.sellDue) sp.set("sellDue", "1");
      if (f.sellReturn) sp.set("sellReturn", "1");
      if (f.advanceBalance) sp.set("advanceBalance", "1");
      if (f.openingBalance) sp.set("openingBalance", "1");
      if (f.hasNoSellFrom) sp.set("hasNoSellFrom", f.hasNoSellFrom);
      if (f.customerGroupId) sp.set("customerGroupId", f.customerGroupId);

      // ✅ assignedTo filter only if admin
      if (isAdmin && f.assignedTo) sp.set("assignedTo", f.assignedTo);

      if (f.status) sp.set("status", f.status);

      const res = await fetch(`/api/erp/customers?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
      setTotals(data.totals || {});

      setCanDelete(Boolean(data.can?.delete));
      setIsAdmin(Boolean(data.can?.admin));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ NEW: set printed time only on client (fix hydration)
  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
  }, []);

  // search with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    f.sellDue,
    f.sellReturn,
    f.advanceBalance,
    f.openingBalance,
    f.hasNoSellFrom,
    f.customerGroupId,
    f.assignedTo,
    f.status,
    isAdmin,
  ]);

  // close columns popover on outside click / ESC
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

  // -------- Print helpers --------
  function onPrint() {
    // update printed time right before printing (optional but nice)
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  // ✅ Export PDF without API: open print dialog (user Save as PDF)
  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  // dynamic footer colSpan
  const visibleKeys = (Object.keys(cols) as ColKey[]).filter((k) => cols[k]);
  const footerMoneyKeys: ColKey[] = ["openingBalance", "advanceBalance", "saleDue", "returnDue"];
  const footerMoneyVisible = footerMoneyKeys.filter((k) => cols[k]);
  const labelSpan = 1 /*Action*/ + visibleKeys.length - footerMoneyVisible.length;

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  return (
    <div className=" p-6 relative ">
      <div className="  max-w-5xl mx-auto">
        {/* ✅ SINGLE GLOBAL PRINT CSS (no duplicate) */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #customers-print-area,
            #customers-print-area * {
              visibility: visible !important;
            }

            #customers-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            /* hide action + controls inside print */
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

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Customers</div>
            <div className="text-sm text-slate-500">Manage your Customers</div>
          </div>

          <button
            className="rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition"
            onClick={() => {
              setEditRow(null);
              setAddOpen(true);
            }}
          >
            + Add
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm no-print">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
            onClick={() => setFiltersOpen((s) => !s)}
          >
            <span>Filters</span>
            <span className="text-slate-500">{filtersOpen ? "▲" : "▼"}</span>
          </button>

          {filtersOpen && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-200">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.sellDue}
                  onChange={(e) => setF({ ...f, sellDue: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Sell Due
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.sellReturn}
                  onChange={(e) => setF({ ...f, sellReturn: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Sell Return
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.advanceBalance}
                  onChange={(e) => setF({ ...f, advanceBalance: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Advance Balance
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.openingBalance}
                  onChange={(e) => setF({ ...f, openingBalance: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Opening Balance
              </label>

              <div>
                <div className="text-xs mb-1 text-slate-500">Has no sell from</div>
                <input
                  type="date"
                  className={inputBase}
                  value={f.hasNoSellFrom}
                  onChange={(e) => setF({ ...f, hasNoSellFrom: e.target.value })}
                />
              </div>

              <div>
                <div className="text-xs mb-1 text-slate-500">Customer Group</div>
                <select
                  className={inputBase}
                  value={f.customerGroupId}
                  onChange={(e) => setF({ ...f, customerGroupId: e.target.value })}
                >
                  <option value="">None</option>
                </select>
              </div>

              <div>
                <div className="text-xs mb-1 text-slate-500">Assigned to</div>
                <select
                  className={inputBase}
                  value={f.assignedTo}
                  onChange={(e) => setF({ ...f, assignedTo: e.target.value })}
                  disabled={usersLoading || !isAdmin}
                >
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs mb-1 text-slate-500">Status</div>
                <select className={inputBase} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  <option value="">None</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2 text-sm flex-wrap text-slate-600">
            <span>Show</span>
            <select
              className={
                "bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
                "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
              }
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
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

            {/* ✅ No API PDF. This uses browser "Save as PDF" */}
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
                  <div className="max-h-80 overflow-auto pr-1">
                    {(
                      [
                        ["contactId", "Contact ID"],
                        ["name", "Business/Name"],
                        ["email", "Email"],
                        ["mobile", "Mobile"],
                        ["taxNumber", "Tax number"],
                        ["creditLimit", "Credit limit"],
                        ["payTerm", "Pay term"],
                        ["openingBalance", "Opening Balance"],
                        ["advanceBalance", "Advance Balance"],
                        ["saleDue", "Total Sale Due"],
                        ["returnDue", "Sell Return Due"],
                        ["status", "Status"],
                        ["createdAt", "Created At"], // ✅ NEW
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
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button className={pillBtn} onClick={() => setCols(DEFAULT_COLS)}>
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

          <input
            className={"w-48 md:w-56 lg:w-64 " + inputBase}
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* ✅ PRINT AREA */}
        <div id="customers-print-area" className="mt-6">
          {/* print-only header */}
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Customers</div>
            <div className="text-sm">Total records: {total}</div>
            {/* ✅ FIXED: no new Date() directly in render */}
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-full w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">
                    Action
                  </th>

                  {cols.contactId && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Contact ID
                    </th>
                  )}
                  {cols.name && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Business/Name
                    </th>
                  )}
                  {cols.email && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Email
                    </th>
                  )}
                  {cols.mobile && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Mobile
                    </th>
                  )}
                  {cols.taxNumber && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Tax number
                    </th>
                  )}
                  {cols.creditLimit && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Credit limit
                    </th>
                  )}
                  {cols.payTerm && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Pay term
                    </th>
                  )}
                  {cols.openingBalance && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Opening Balance
                    </th>
                  )}
                  {cols.advanceBalance && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Advance Balance
                    </th>
                  )}
                  {cols.saleDue && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Total Sale Due
                    </th>
                  )}
                  {cols.returnDue && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Sell Return Due
                    </th>
                  )}
                  {cols.status && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Status
                    </th>
                  )}

                  {/* ✅ NEW COLUMN HEADER */}
                  {cols.createdAt && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Created At
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={1 + visibleKeys.length}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 no-print">
                        <ActionDropdown
                          row={r}
                          canDelete={canDelete}
                          onPay={() => setPayRow(r)}
                          onEdit={() => {
                            setEditRow(r);
                            setAddOpen(true);
                          }}
                          onToggleActive={async () => {
                            await fetch(`/api/erp/customers/${r._id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
                            });
                            load();
                          }}
                          onDelete={async () => {
                            if (!confirm("Delete?")) return;
                            const res = await fetch(`/api/erp/customers/${r._id}`, { method: "DELETE" });
                            if (!res.ok) alert("Failed");
                            load();
                          }}
                        />
                      </td>

                      {cols.contactId && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.contactId}</td>}
                      {cols.name && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.businessName || r.name}</td>
                      )}
                      {cols.email && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.email || "-"}</td>}
                      {cols.mobile && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.mobile}</td>}

                      {cols.taxNumber && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.moreInfo?.taxNumber || "-"}</td>
                      )}
                      {cols.creditLimit && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.moreInfo?.creditLimit ?? "-"}</td>
                      )}
                      {cols.payTerm && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.moreInfo?.payTerm || "-"}</td>
                      )}

                      {cols.openingBalance && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          Rs. {money(r.totals?.openingBalanceDue)}
                        </td>
                      )}
                      {cols.advanceBalance && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">Rs. {money(r.totals?.advanceBalance)}</td>
                      )}
                      {cols.saleDue && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          {money(r.totals?.totalSaleDue) > 0 ? (
                            <a className="text-indigo-600 hover:text-indigo-800" href={`/erp/sales/list?customerId=${r._id}`}>
                              Rs. {money(r.totals?.totalSaleDue)}
                            </a>
                          ) : (
                            <>Rs. {money(r.totals?.totalSaleDue)}</>
                          )}
                        </td>
                      )}
                      {cols.returnDue && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          {money(r.totals?.totalSaleReturnDue) > 0 ? (
                            <a className="text-indigo-600 hover:text-indigo-800" href={`/erp/sales/returns?customerId=${r._id}`}>
                              Rs. {money(r.totals?.totalSaleReturnDue)}
                            </a>
                          ) : (
                            <>Rs. {money(r.totals?.totalSaleReturnDue)}</>
                          )}
                        </td>
                      )}
                      {cols.status && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.status}</td>}

                      {/* ✅ NEW: createdAt cell */}
                      {cols.createdAt && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={1 + visibleKeys.length}>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={Math.max(1, labelSpan)}>
                    Total:
                  </td>

                  {cols.openingBalance && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      Rs. {money(totals.openingBalanceDue)}
                    </td>
                  )}
                  {cols.advanceBalance && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.advanceBalance)}</td>
                  )}
                  {cols.saleDue && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.totalSaleDue)}</td>
                  )}
                  {cols.returnDue && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      Rs. {money(totals.totalSaleReturnDue)}
                    </td>
                  )}

                  {footerMoneyVisible.length === 0 && <td className="px-4 py-3" />}
                </tr>
              </tfoot>
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

        {/* Modals */}
        <CustomerFormModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          initial={editRow}
          onSaved={load}
          isAdmin={isAdmin}
          users={users}
        />

        <PayModal open={Boolean(payRow)} onClose={() => setPayRow(null)} contact={payRow} onSaved={load} />
      </div>
    </div>
  );
}