"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { CustomerViewHeader } from "@/app/components/suppliers/CustomerViewHeader";
import { NotesModal } from "@/app/components/suppliers/Notesmodal";
import { ContactPersonsPanel } from "@/app/components/suppliers/ContactPersonsPanel";

type Tab =
  | "LEDGER"
  | "PURCHASES"
  | "ORDERS"
  | "STOCK_REPORT"
  | "DOCS"
  | "PAYMENTS"
  | "ACTIVITIES"
  | "CONTACT_PERSONS";

function fmtPK(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildAddress(contact: any) {
  const a = contact?.moreInfo?.billingAddress || {};
  const parts = [a.line1, a.line2, a.city, a.state, a.country, a.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

function badge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "FINAL") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function SupplierViewPage() {
  const params = useParams();
  const id = String(params.id);

  const [contact, setContact] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("LEDGER");

  const [notesOpen, setNotesOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInvoice: 0,
    totalPaid: 0,
    balanceDue: 0,
    advance: 0,
  });

  // Purchases tab UI state (placeholder)
  const [purchaseDateRange, setPurchaseDateRange] = useState("01/01/2026 - 12/31/2026");
  // Stock report UI state (placeholder)
  const [businessLocation, setBusinessLocation] = useState("All locations");

  // Orders tab state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [printedAt, setPrintedAt] = useState("");

  function buildLedger(nextContact: any, nextPayments: any[]) {
    const rows: any[] = [];

    const opening = Number(nextContact?.moreInfo?.openingBalance ?? nextContact?.totals?.openingBalanceDue ?? 0) || 0;
    const advance = Number(nextContact?.totals?.advanceBalance ?? 0) || 0;
    const totalPurchaseDue = Number(nextContact?.totals?.totalPurchaseDue ?? 0) || 0;
    const totalPurchaseReturnDue = Number(nextContact?.totals?.totalPurchaseReturnDue ?? 0) || 0;

    if (opening > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Opening Balance",
        ref: "-",
        debit: opening,
        credit: 0,
        method: "-",
        note: "Opening balance",
      });
    }

    if (totalPurchaseDue > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Purchase Due",
        ref: "-",
        debit: totalPurchaseDue,
        credit: 0,
        method: "-",
        note: "Total purchase due",
      });
    }

    if (totalPurchaseReturnDue > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Purchase Return",
        ref: "-",
        debit: 0,
        credit: totalPurchaseReturnDue,
        method: "-",
        note: "Purchase returns",
      });
    }

    if (advance > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Advance Balance",
        ref: "-",
        debit: 0,
        credit: advance,
        method: "-",
        note: "Advance balance",
      });
    }

    for (const p of nextPayments || []) {
      rows.push({
        date: p.paidOn,
        type: p.paymentFor || "Payment",
        ref: p.referenceNo || "-",
        debit: 0,
        credit: Number(p.amount || 0),
        method: p.paymentMethod || "-",
        note: p.note || "-",
      });
    }

    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);

    const totalInvoice = totalPurchaseDue;
    const totalPaid = totalCredit;
    const balanceDue = totalDebit - totalCredit;

    setLedgerRows(rows);
    setLedgerSummary({
      totalInvoice,
      totalPaid,
      balanceDue,
      advance: balanceDue < 0 ? Math.abs(balanceDue) : 0,
    });
  }

  async function loadContact() {
    const res = await fetch(`/api/erp/suppliers/${id}`, { cache: "no-store" });
    const data = await res.json();
    setContact(data.contact);
    buildLedger(data.contact, payments);
  }

  async function loadPayments() {
    // ✅ SAME API (do not change)
    const res = await fetch(`/api/erp/suppliers/${id}/payments`, { cache: "no-store" });
    const data = await res.json();
    const rows = data.rows || [];
    setPayments(rows);
    if (contact) buildLedger(contact, rows);
  }

  async function loadNotes() {
    // ✅ SAME API (do not change)
    const res = await fetch(`/api/erp/suppliers/${id}/notes`, { cache: "no-store" });
    const data = await res.json();
    setNotes(data.rows || []);
  }

  async function loadActivities() {
    // ✅ SAME API (do not change)
    const res = await fetch(`/api/erp/suppliers/${id}/activities`, { cache: "no-store" });
    const data = await res.json();
    setActivities(data.rows || []);
  }

  async function loadPurchases() {
    setPurchasesLoading(true);
    try {
      const res = await fetch(`/api/erp/suppliers/${id}/purchases`, { cache: "no-store" });
      const data = await res.json();
      setPurchases(data.rows || []);
    } finally {
      setPurchasesLoading(false);
    }
  }

  // load supplier orders
  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/erp/suppliers/${id}/orders`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.rows || []);
      setOrdersTotal(Number(data.total || 0));
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!contact) return;

    if (tab === "PAYMENTS") loadPayments();
    if (tab === "DOCS") loadNotes();
    if (tab === "ACTIVITIES") loadActivities();
    if (tab === "LEDGER") loadPayments();
    if (tab === "PURCHASES") loadPurchases();
    if (tab === "ORDERS") loadOrders();
  }, [tab, contact]);

  if (!contact) return <div className="p-6 text-slate-500">Loading...</div>;

  const canEdit = true;

  const tableHead = "px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide";
  const tableCell = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  return (
    <div className="p-6 space-y-6 ">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #supplier-detail-print, #supplier-detail-print * { visibility: visible !important; }
          #supplier-detail-print { 
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
          .overflow-x-auto, .overflow-auto {
            overflow: visible !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="supplier-detail-print">
      <div className="hidden print:block mb-3">
        <div className="text-lg font-semibold">Supplier Detail</div>
        <div className="text-sm">{contact.businessName || contact.name}</div>
        <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
      </div>

      <div className="no-print">
        <CustomerViewHeader current={contact} />
      </div>

      {/* Top details */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="text-sm text-slate-700 space-y-1">
            <div className="font-semibold">
              {contact.businessName || contact.name}{" "}
              <span className="text-slate-500 font-normal">, Supplier</span>
            </div>
            <div>
              <b>Address:</b> {buildAddress(contact)}
            </div>
            <div>
              <b>Business Name:</b> {contact.businessName || "-"}
            </div>
            <div>
              <b>Mobile:</b> {contact.mobile || "-"}
            </div>
          </div>

          <div className="text-sm text-slate-700 space-y-1">
            <div><b>Total Purchase Due:</b> Rs. {Number(contact.totals?.totalPurchaseDue || 0)}</div>
            <div><b>Purchase Returns:</b> Rs. {Number(contact.totals?.totalPurchaseReturnDue || 0)}</div>
            <div><b>Advance Balance:</b> Rs. {Number(contact.totals?.advanceBalance || 0)}</div>
            <div><b>Opening Balance:</b> Rs. {Number(contact.totals?.openingBalanceDue || 0)}</div>
          </div>

          <div className="no-print flex gap-2">
            <button className={pillBtn} onClick={onExportPdf}>Export PDF</button>
            <button className={pillBtn} onClick={onPrint}>Print</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4 text-sm flex-wrap">
        {[
          ["LEDGER", "Ledger"],
          ["PURCHASES", "Purchases"],
          ["ORDERS", "Orders"], // ✅ NEW TAB
          ["STOCK_REPORT", "Stock Report"],
          ["DOCS", "Documents & Note"],
          ["PAYMENTS", "Payments"],
          ["ACTIVITIES", "Activities"],
          ["CONTACT_PERSONS", "Contact Persons"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`px-3 py-2 -mb-px border-b-2 transition ${
              tab === (k as Tab)
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab(k as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LEDGER */}
      {tab === "LEDGER" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="text-sm font-semibold text-slate-800">Ledger</div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700">
            <div>Total invoice: Rs {ledgerSummary.totalInvoice}</div>
            <div>Total paid: Rs {ledgerSummary.totalPaid}</div>
            {ledgerSummary.balanceDue >= 0 ? (
              <div>Balance due: Rs {ledgerSummary.balanceDue}</div>
            ) : (
              <div>Advance: Rs {ledgerSummary.advance}</div>
            )}
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Type</th>
                  <th className={tableHead}>Ref</th>
                  <th className={tableHead}>Debit</th>
                  <th className={tableHead}>Credit</th>
                  <th className={tableHead}>Method</th>
                  <th className={tableHead}>Note</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length ? (
                  ledgerRows.map((r, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(r.date)}</td>
                      <td className={tableCell}>{r.type}</td>
                      <td className={tableCell}>{r.ref}</td>
                      <td className={tableCell}>Rs {r.debit}</td>
                      <td className={tableCell}>Rs {r.credit}</td>
                      <td className={tableCell}>{r.method}</td>
                      <td className={tableCell}>{r.note}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                      No ledger entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PURCHASES (updated with real integration) */}
      {tab === "PURCHASES" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Purchase Bills & Invoices</div>
            <div className="text-xs text-slate-500">
              {purchasesLoading ? "Loading..." : `${purchases.length} records`}
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Reference No</th>
                  <th className={tableHead}>Type</th>
                  <th className={tableHead}>Status</th>
                  <th className={tableHead}>Amount</th>
                  <th className={tableHead}>Due Amount</th>
                  <th className={tableHead}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchasesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                      Loading purchase data...
                    </td>
                  </tr>
                ) : purchases.length ? (
                  purchases.map((purchase: any) => (
                    <tr key={purchase._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(purchase.date)}</td>
                      <td className={tableCell}>{purchase.referenceNo}</td>
                      <td className={tableCell}>{purchase.type}</td>
                      <td className={tableCell}>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {purchase.status}
                        </span>
                      </td>
                      <td className={tableCell}>Rs. {money(purchase.amount)}</td>
                      <td className={tableCell}>Rs. {money(purchase.dueAmount)}</td>
                      <td className={tableCell}>
                        <button className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-sm text-slate-500 text-center">
                      <div className="space-y-2">
                        <div>No purchase records found for this supplier</div>
                        <div className="text-xs text-slate-400">
                          Purchase bills and invoices will appear here when the purchase module is integrated
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-500">Total Purchases</div>
                <div className="font-semibold">Rs. {Number(contact.totals?.totalPurchaseDue || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Purchase Returns</div>
                <div className="font-semibold text-orange-600">Rs. {Number(contact.totals?.totalPurchaseReturnDue || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Net Due</div>
                <div className="font-semibold text-red-600">
                  Rs. {Math.max(0, (Number(contact.totals?.totalPurchaseDue || 0) - Number(contact.totals?.totalPurchaseReturnDue || 0) - Number(contact.totals?.advanceBalance || 0)))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Advance</div>
                <div className="font-semibold text-green-600">Rs. {Number(contact.totals?.advanceBalance || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "ORDERS" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Purchase Orders</div>
              <div className="text-xs text-slate-500">
                {ordersLoading ? "Loading..." : `Total: ${ordersTotal} orders`}
              </div>
            </div>

            <div className="flex gap-2">
              <button className={pillBtn} onClick={() => window.location.href = '/erp/purchase/orders'}>
                View All Orders
              </button>
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Reference</th>
                  <th className={tableHead}>Status</th>
                  <th className={tableHead}>Total</th>
                  <th className={tableHead}>Action</th>
                </tr>
              </thead>

              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-slate-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(r.orderDate)}</td>
                      <td className={tableCell}>{r.referenceNo}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className={tableCell}>Rs {money(r.subtotal)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-sm text-slate-500 text-center">
                      <div className="space-y-2">
                        <div>No purchase orders found for this supplier</div>
                        <div className="text-xs text-slate-400">
                          Purchase orders will appear here when the purchase orders module is integrated
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <b>Note:</b> Purchase orders are preliminary documents that don't affect stock or supplier balance until converted to Purchase Bills.
          </div>
        </div>
      )}

      {/* STOCK REPORT (enhanced with proper structure) */}
      {tab === "STOCK_REPORT" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Stock Report by Supplier</div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Business Location:</span>
              <select
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm"
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
              >
                <option>All locations</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Product</th>
                  <th className={tableHead}>SKU</th>
                  <th className={tableHead}>Purchase Quantity</th>
                  <th className={tableHead}>Current Stock</th>
                  <th className={tableHead}>Stock Value</th>
                  <th className={tableHead}>Last Purchase Date</th>
                  <th className={tableHead}>Last Purchase Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-sm text-slate-500 text-center">
                    <div className="space-y-2">
                      <div>No stock data available for this supplier</div>
                      <div className="text-xs text-slate-400">
                        Stock information will appear here when products are purchased from this supplier
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOCS */}
      {tab === "DOCS" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex justify-between">
            <div className="text-sm font-semibold text-slate-800">Documents & Note</div>
            <button
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700"
              onClick={() => setNotesOpen(true)}
            >
              + Add
            </button>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[700px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Heading</th>
                  <th className={tableHead}>Added By</th>
                  <th className={tableHead}>Created At</th>
                  <th className={tableHead}>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {notes.length ? (
                  notes.map((n) => (
                    <tr key={n._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{n.heading}</td>
                      <td className={tableCell}>{String(n.createdBy)}</td>
                      <td className={tableCell}>{fmtPK(n.createdAt)}</td>
                      <td className={tableCell}>{fmtPK(n.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} contactId={contact._id} onSaved={loadNotes} />
        </div>
      )}

      {/* PAYMENTS */}
      {tab === "PAYMENTS" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-800 mb-3">Payments</div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Paid on</th>
                  <th className={tableHead}>Reference No</th>
                  <th className={tableHead}>Amount</th>
                  <th className={tableHead}>Payment Method</th>
                  <th className={tableHead}>Payment For</th>
                  <th className={tableHead}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length ? (
                  payments.map((p) => (
                    <tr key={p._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(p.paidOn)}</td>
                      <td className={tableCell}>{p.referenceNo || "-"}</td>
                      <td className={tableCell}>Rs {p.amount}</td>
                      <td className={tableCell}>{p.paymentMethod}</td>
                      <td className={tableCell}>{p.paymentFor || "-"}</td>
                      <td className={tableCell}>-</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVITIES */}
      {tab === "ACTIVITIES" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-800 mb-3">Activities</div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[700px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Action</th>
                  <th className={tableHead}>By</th>
                  <th className={tableHead}>Note</th>
                </tr>
              </thead>
              <tbody>
                {activities.length ? (
                  activities.map((a) => (
                    <tr key={a._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(a.createdAt)}</td>
                      <td className={tableCell}>{a.action}</td>
                      <td className={tableCell}>{String(a.by)}</td>
                      <td className={tableCell}>{a.meta?.heading || a.meta?.amount || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTACT PERSONS */}
      {tab === "CONTACT_PERSONS" && <ContactPersonsPanel contact={contact} onUpdated={loadContact} canEdit={canEdit} />}
      </div>
    </div>
  );
}