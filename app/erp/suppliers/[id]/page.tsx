"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { CustomerViewHeader } from "@/app/components/suppliers/CustomerViewHeader";
import { NotesModal } from "@/app/components/suppliers/Notesmodal";
import { ContactPersonsPanel } from "@/app/components/suppliers/ContactPersonsPanel";

type Tab =
  | "LEDGER"
  | "PURCHASES"
  | "ORDERS" // ✅ NEW
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

  // ✅ NEW: Orders tab state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [printedAt, setPrintedAt] = useState("");

  function buildLedger(nextContact: any, nextPayments: any[]) {
    const rows: any[] = [];

    const opening = Number(nextContact?.moreInfo?.openingBalance ?? nextContact?.totals?.openingBalanceDue ?? 0) || 0;
    const advance = Number(nextContact?.totals?.advanceBalance ?? 0) || 0;

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

    const totalInvoice = 0; // purchases module later
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

  // ✅ NEW: load supplier orders
  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", "1");
      sp.set("limit", "25");
      sp.set("supplierId", id); // ✅ IMPORTANT: API must support this
      const res = await fetch(`/api/erp/purchase/order?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setOrders(Array.isArray(data.rows) ? data.rows : []);
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

    // ✅ NEW
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
            <div>
              <b>Tax number:</b> {contact.moreInfo?.taxNumber || "-"}
            </div>
            <div>
              <b>Pay term:</b> {contact.moreInfo?.payTerm || "-"}
            </div>
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

      {/* PURCHASES (placeholder - as-is) */}
      {tab === "PURCHASES" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Purchases</div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Date Range:</span>
              <input
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm"
                value={purchaseDateRange}
                onChange={(e) => setPurchaseDateRange(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Action</th>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Reference No</th>
                  <th className={tableHead}>Location</th>
                  <th className={tableHead}>Supplier</th>
                  <th className={tableHead}>Purchase Status</th>
                  <th className={tableHead}>Payment Status</th>
                  <th className={tableHead}>Grand Total</th>
                  <th className={tableHead}>Payment due</th>
                  <th className={tableHead}>Added By</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-sm text-slate-500">
                    No data available in table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm text-slate-700">
            <b>Total:</b> Rs 0.00 &nbsp; | &nbsp; Purchase Due - Rs 0.00 &nbsp; | &nbsp; Purchase Return - Rs 0.00
          </div>
        </div>
      )}

      {/* ✅ NEW: ORDERS TAB */}
      {tab === "ORDERS" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Purchase Orders</div>
              <div className="text-xs text-slate-500">Total: {ordersTotal}</div>
            </div>

            <a className={pillBtn} href="/erp/purchase/order">
              View All Orders
            </a>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Date</th>
                  <th className={tableHead}>Reference</th>
                  <th className={tableHead}>Location</th>
                  <th className={tableHead}>Status</th>
                  <th className={tableHead}>Total</th>
                  <th className={tableHead}>Action</th>
                </tr>
              </thead>

              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{fmtPK(r.orderDate)}</td>
                      <td className={tableCell}>{r.referenceNo}</td>
                      <td className={tableCell}>{r.locationName || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className={tableCell}>Rs {money(r.subtotal)}</td>
                      <td className="px-4 py-3 text-sm">
                        <a
                          className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
                          href={`/erp/purchase/order/${r._id}`}
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                      No orders found for this supplier
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">
            Note: Orders do not affect stock/due until converted to Purchase (Bill).
          </div>
        </div>
      )}

      {/* STOCK REPORT (placeholder - as-is) */}
      {tab === "STOCK_REPORT" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Stock Report</div>
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
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={tableHead}>Product</th>
                  <th className={tableHead}>SKU</th>
                  <th className={tableHead}>Purchase Quantity</th>
                  <th className={tableHead}>Total Sold</th>
                  <th className={tableHead}>Total Unit Transfered</th>
                  <th className={tableHead}>Total returned</th>
                  <th className={tableHead}>Current stock</th>
                  <th className={tableHead}>Current Stock Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-sm text-slate-500">
                    No data available in table
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