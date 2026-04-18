"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CustomerFormModal } from "@/app/components/suppliers/CustomerFormModal";
import { ActionDropdown } from "@/app/components/suppliers/ActionDropdown";
import { PayModal } from "@/app/components/suppliers/PayModal";

type ContactRow = any;

type ColKey =
  | "contactId"
  | "businessName"
  | "name"
  | "email"
  | "taxNumber"
  | "payTerm"
  | "openingBalance"
  | "advanceBalance"
  | "createdAt"
  | "address"
  | "mobile"
  | "purchaseDue"
  | "purchaseReturnDue"
  | "status";

const DEFAULT_COLS: Record<ColKey, boolean> = {
  contactId: true,
  businessName: true,
  name: true,
  email: true,
  taxNumber: true,
  payTerm: true,
  openingBalance: true,
  advanceBalance: true,
  createdAt: true,
  address: true,
  mobile: true,
  purchaseDue: true,
  purchaseReturnDue: true,
  status: false, // (image me row me status nahi tha - optional)
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


function buildAddress(r: any) {
  const a = r?.moreInfo?.billingAddress || {};
  const parts = [a.line1, a.line2, a.city, a.state, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

export default function SuppliersPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<any>({
    totalPurchaseDue: 0,
    totalPurchaseReturnDue: 0,
    openingBalanceDue: 0,
    advanceBalance: 0,
  });

  const [loading, setLoading] = useState(false);

  const [canDelete, setCanDelete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [payRow, setPayRow] = useState<any>(null);

  const [colsOpen, setColsOpen] = useState(false);
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const colsMenuRef = useRef<HTMLDivElement | null>(null);

  // printed time hydration safe
  const [printedAt, setPrintedAt] = useState("");

  // filters (image #1)
  const [f, setF] = useState({
    purchaseDue: false,
    purchaseReturn: false,
    advanceBalance: false,
    openingBalance: false,
    assignedTo: "",
    status: "",
  });

  const [users, setUsers] = useState<Array<{ _id: string; name: string; role: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const exportCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/suppliers/export/csv?${sp.toString()}`;
  }, [q]);

  const exportExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return `/api/erp/suppliers/export/excel?${sp.toString()}`;
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

      if (f.purchaseDue) sp.set("purchaseDue", "1");
      if (f.purchaseReturn) sp.set("purchaseReturn", "1");
      if (f.advanceBalance) sp.set("advanceBalance", "1");
      if (f.openingBalance) sp.set("openingBalance", "1");

      if (isAdmin && f.assignedTo) sp.set("assignedTo", f.assignedTo);
      if (f.status) sp.set("status", f.status);

      const res = await fetch(`/api/erp/suppliers?${sp.toString()}`, { cache: "no-store" });
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

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, f.purchaseDue, f.purchaseReturn, f.advanceBalance, f.openingBalance, f.assignedTo, f.status, isAdmin]);

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

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }
  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  const visibleKeys = (Object.keys(cols) as ColKey[]).filter((k) => cols[k]);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  return (
    <div className="p-6 relative">
      <div className="max-w-5xl mx-auto">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #suppliers-print-area,
            #suppliers-print-area * {
              visibility: visible !important;
            }
            #suppliers-print-area {
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

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Suppliers</div>
            <div className="text-sm text-slate-500">Manage your Suppliers</div>
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

        {/* Filters (image #1) */}
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
                  checked={f.purchaseDue}
                  onChange={(e) => setF({ ...f, purchaseDue: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Purchase Due
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.purchaseReturn}
                  onChange={(e) => setF({ ...f, purchaseReturn: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Purchase Return
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
                        ["businessName", "Business Name"],
                        ["name", "Name"],
                        ["email", "Email"],
                        ["taxNumber", "Tax number"],
                        ["payTerm", "Pay term"],
                        ["openingBalance", "Opening Balance"],
                        ["advanceBalance", "Advance Balance"],
                        ["createdAt", "Added On"],
                        ["address", "Address"],
                        ["mobile", "Mobile"],
                        ["purchaseDue", "Total Purchase Due"],
                        ["purchaseReturnDue", "Total Purchase Return Due"],
                        ["status", "Status"],
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

          <input className={"w-48 md:w-56 lg:w-64 " + inputBase} placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* PRINT AREA */}
        <div id="suppliers-print-area" className="mt-6">
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">Suppliers</div>
            <div className="text-sm">Total records: {total}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">
                    Action
                  </th>

                  {cols.contactId && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Contact ID</th>}
                  {cols.businessName && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Business Name</th>}
                  {cols.name && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>}
                  {cols.email && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</th>}
                  {cols.taxNumber && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Tax number</th>}
                  {cols.payTerm && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Pay term</th>}
                  {cols.openingBalance && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Opening Balance</th>}
                  {cols.advanceBalance && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Advance Balance</th>}
                  {cols.createdAt && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Added On</th>}
                  {cols.address && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Address</th>}
                  {cols.mobile && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Mobile</th>}
                  {cols.purchaseDue && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Purchase Due</th>}
                  {cols.purchaseReturnDue && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Purchase Return Due</th>}
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
                            await fetch(`/api/erp/suppliers/${r._id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
                            });
                            load();
                          }}
                          onDelete={async () => {
                            if (!confirm("Delete?")) return;
                            const res = await fetch(`/api/erp/suppliers/${r._id}`, { method: "DELETE" });
                            if (!res.ok) alert("Failed");
                            load();
                          }}
                        />
                      </td>

                      {cols.contactId && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.contactId}</td>}
                      {cols.businessName && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.businessName || "-"}</td>}
                      {cols.name && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.name || "-"}</td>}
                      {cols.email && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.email || "-"}</td>}
                      {cols.taxNumber && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.moreInfo?.taxNumber || "-"}</td>}
                      {cols.payTerm && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.moreInfo?.payTerm || "-"}</td>}

                      {cols.openingBalance && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">Rs. {money(r.totals?.openingBalanceDue)}</td>}
                      {cols.advanceBalance && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">Rs. {money(r.totals?.advanceBalance)}</td>}
                      {cols.createdAt && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{fmtDate(r.createdAt)}</td>}
                      {cols.address && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{buildAddress(r)}</td>}
                      {cols.mobile && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{r.mobile || "-"}</td>}

                      {cols.purchaseDue && <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">Rs. {money(r.totals?.totalPurchaseDue)}</td>}
                      {cols.purchaseReturnDue && (
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">Rs. {money(r.totals?.totalPurchaseReturnDue)}</td>
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
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={Math.max(1, 6)}>
                    Total:
                  </td>

                  {cols.openingBalance && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.openingBalanceDue)}</td>
                  )}
                  {cols.advanceBalance && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.advanceBalance)}</td>
                  )}
                  {cols.createdAt && <td className="px-4 py-3" />}
                  {cols.address && <td className="px-4 py-3" />}
                  {cols.mobile && <td className="px-4 py-3" />}

                  {cols.purchaseDue && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.totalPurchaseDue)}</td>
                  )}
                  {cols.purchaseReturnDue && (
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.totalPurchaseReturnDue)}</td>
                  )}
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
        <CustomerFormModal open={addOpen} onClose={() => setAddOpen(false)} initial={editRow} onSaved={load} isAdmin={isAdmin} users={users} />
        <PayModal open={Boolean(payRow)} onClose={() => setPayRow(null)} contact={payRow} onSaved={load} />
      </div>
    </div>
  );
}