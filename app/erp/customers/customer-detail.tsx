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
  | "status";

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
};

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
    window.print();
  }

  // ✅ Export PDF without API: open print dialog (user Save as PDF)
  function onExportPdf() {
    window.print();
  }

  // dynamic footer colSpan
  const visibleKeys = (Object.keys(cols) as ColKey[]).filter((k) => cols[k]);
  const footerMoneyKeys: ColKey[] = ["openingBalance", "advanceBalance", "saleDue", "returnDue"];
  const footerMoneyVisible = footerMoneyKeys.filter((k) => cols[k]);
  const labelSpan = 1 /*Action*/ + visibleKeys.length - footerMoneyVisible.length;

  return (
    <div className="p-4 relative z-0">
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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Customers</div>
          <div className="text-sm text-muted-foreground">Manage your Customers</div>
        </div>

        <button
          className="rounded-full px-4 py-2 bg-blue-600 text-white"
          onClick={() => {
            setEditRow(null);
            setAddOpen(true);
          }}
        >
          + Add
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 border rounded-md no-print">
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm"
          onClick={() => setFiltersOpen((s) => !s)}
        >
          <span>Filters</span>
          <span>{filtersOpen ? "▲" : "▼"}</span>
        </button>

        {filtersOpen && (
          <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3 border-t">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.sellDue} onChange={(e) => setF({ ...f, sellDue: e.target.checked })} />
              Sell Due
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.sellReturn} onChange={(e) => setF({ ...f, sellReturn: e.target.checked })} />
              Sell Return
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.advanceBalance} onChange={(e) => setF({ ...f, advanceBalance: e.target.checked })} />
              Advance Balance
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.openingBalance} onChange={(e) => setF({ ...f, openingBalance: e.target.checked })} />
              Opening Balance
            </label>

            <div>
              <div className="text-xs mb-1">Has no sell from</div>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={f.hasNoSellFrom}
                onChange={(e) => setF({ ...f, hasNoSellFrom: e.target.value })}
              />
            </div>

            <div>
              <div className="text-xs mb-1">Customer Group</div>
              <select className="w-full border rounded px-2 py-1" value={f.customerGroupId} onChange={(e) => setF({ ...f, customerGroupId: e.target.value })}>
                <option value="">None</option>
              </select>
            </div>

            <div>
              <div className="text-xs mb-1">Assigned to</div>
              <select
                className="w-full border rounded px-2 py-1"
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
              <div className="text-xs mb-1">Status</div>
              <select className="w-full border rounded px-2 py-1" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="">None</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span>Show</span>
          <select className="border rounded px-2 py-1" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>entries</span>

          <a className="ml-3 text-sm border rounded px-2 py-1" href={exportCsvUrl} target="_blank" rel="noreferrer">
            Export CSV
          </a>
          <a className="text-sm border rounded px-2 py-1" href={exportExcelUrl} target="_blank" rel="noreferrer">
            Export Excel
          </a>

          {/* ✅ No API PDF. This uses browser "Save as PDF" */}
          <button className="text-sm border rounded px-2 py-1" onClick={onExportPdf}>
            Export PDF
          </button>

          <button className="text-sm border rounded px-2 py-1" onClick={onPrint}>
            Print
          </button>

          <div className="relative" ref={colsMenuRef}>
            <button className="text-sm border rounded px-2 py-1" onClick={() => setColsOpen((s) => !s)}>
              Column visibility ▾
            </button>
            {colsOpen && (
              <div className="absolute z-50 mt-2 w-64 bg-white border rounded shadow p-2">
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
                  ] as Array<[ColKey, string]>
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={cols[k]} onChange={() => toggleCol(k)} />
                    {label}
                  </label>
                ))}
                <div className="pt-2 flex gap-2">
                  <button className="text-xs border rounded px-2 py-1" onClick={() => setCols(DEFAULT_COLS)}>
                    Reset
                  </button>
                  <button className="text-xs border rounded px-2 py-1" onClick={() => setColsOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <input className="border rounded px-2 py-1 w-64" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* ✅ PRINT AREA */}
      <div id="customers-print-area" className="mt-3">
        {/* print-only header */}
        <div className="hidden print:block mb-3">
          <div className="text-lg font-semibold">Customers</div>
          <div className="text-sm">Total records: {total}</div>
          <div className="text-xs text-gray-500">Printed: {new Date().toLocaleString()}</div>
        </div>

        <div className="border rounded-md overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left no-print">Action</th>
                {cols.contactId && <th className="p-2 text-left">Contact ID</th>}
                {cols.name && <th className="p-2 text-left">Business/Name</th>}
                {cols.email && <th className="p-2 text-left">Email</th>}
                {cols.mobile && <th className="p-2 text-left">Mobile</th>}
                {cols.taxNumber && <th className="p-2 text-left">Tax number</th>}
                {cols.creditLimit && <th className="p-2 text-left">Credit limit</th>}
                {cols.payTerm && <th className="p-2 text-left">Pay term</th>}
                {cols.openingBalance && <th className="p-2 text-left">Opening Balance</th>}
                {cols.advanceBalance && <th className="p-2 text-left">Advance Balance</th>}
                {cols.saleDue && <th className="p-2 text-left">Total Sale Due</th>}
                {cols.returnDue && <th className="p-2 text-left">Sell Return Due</th>}
                {cols.status && <th className="p-2 text-left">Status</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={1 + visibleKeys.length}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-2 no-print">
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

                    {cols.contactId && <td className="p-2">{r.contactId}</td>}
                    {cols.name && <td className="p-2">{r.businessName || r.name}</td>}
                    {cols.email && <td className="p-2">{r.email || "-"}</td>}
                    {cols.mobile && <td className="p-2">{r.mobile}</td>}

                    {cols.taxNumber && <td className="p-2">{r.moreInfo?.taxNumber || "-"}</td>}
                    {cols.creditLimit && <td className="p-2">{r.moreInfo?.creditLimit ?? "-"}</td>}
                    {cols.payTerm && <td className="p-2">{r.moreInfo?.payTerm || "-"}</td>}

                    {cols.openingBalance && <td className="p-2">Rs. {money(r.totals?.openingBalanceDue)}</td>}
                    {cols.advanceBalance && <td className="p-2">Rs. {money(r.totals?.advanceBalance)}</td>}
                    {cols.saleDue && <td className="p-2">Rs. {money(r.totals?.totalSaleDue)}</td>}
                    {cols.returnDue && <td className="p-2">Rs. {money(r.totals?.totalSaleReturnDue)}</td>}
                    {cols.status && <td className="p-2">{r.status}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3" colSpan={1 + visibleKeys.length}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t bg-muted/50">
                <td className="p-2 font-semibold" colSpan={Math.max(1, labelSpan)}>
                  Total:
                </td>

                {cols.openingBalance && <td className="p-2 font-semibold">Rs. {money(totals.openingBalanceDue)}</td>}
                {cols.advanceBalance && <td className="p-2 font-semibold">Rs. {money(totals.advanceBalance)}</td>}
                {cols.saleDue && <td className="p-2 font-semibold">Rs. {money(totals.totalSaleDue)}</td>}
                {cols.returnDue && <td className="p-2 font-semibold">Rs. {money(totals.totalSaleReturnDue)}</td>}

                {footerMoneyVisible.length === 0 && <td className="p-2" />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-end gap-2 text-sm no-print">
        <button className="border rounded px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <div className="px-2">Page {page}</div>
        <button className="border rounded px-2 py-1" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
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
  );
}