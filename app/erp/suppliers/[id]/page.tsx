"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { CustomerViewHeader } from "@/app/components/suppliers/CustomerViewHeader";
import { NotesModal } from "@/app/components/suppliers/Notesmodal";
import { ContactPersonsPanel } from "@/app/components/suppliers/ContactPersonsPanel";

type Tab = "LEDGER" | "PURCHASES" | "STOCK_REPORT" | "DOCS" | "PAYMENTS" | "ACTIVITIES" | "CONTACT_PERSONS";

function fmtPK(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}

function buildAddress(contact: any) {
  const a = contact?.moreInfo?.billingAddress || {};
  const parts = [a.line1, a.line2, a.city, a.state, a.country, a.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
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

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!contact) return;

    if (tab === "PAYMENTS") loadPayments();
    if (tab === "DOCS") loadNotes();
    if (tab === "ACTIVITIES") loadActivities();
    if (tab === "LEDGER") loadPayments();
  }, [tab, contact]);

  if (!contact) return <div className="p-6 text-slate-500">Loading...</div>;

  const canEdit = true;

  const tableHead = "px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide";
  const tableCell = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  return (
    <div className="p-6 space-y-6 ">
      <CustomerViewHeader current={contact} />

      {/* Top details (image #5 style) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row justify-between gap-4">
        <div className="text-sm text-slate-700 space-y-1">
          <div className="font-semibold">{contact.businessName || contact.name} <span className="text-slate-500 font-normal">, Supplier</span></div>
          <div><b>Address:</b> {buildAddress(contact)}</div>
          <div><b>Business Name:</b> {contact.businessName || "-"}</div>
          <div><b>Mobile:</b> {contact.mobile || "-"}</div>
        </div>

        <div className="text-sm text-slate-700 space-y-1">
          <div><b>Tax number:</b> {contact.moreInfo?.taxNumber || "-"}</div>
        
          <div><b>Pay term:</b> {contact.moreInfo?.payTerm || "-"}</div>
        </div>
      </div>

      {/* Tabs (image #3/#4) */}
      <div className="border-b border-slate-200 flex gap-4 text-sm flex-wrap">
        {[
          ["LEDGER", "Ledger"],
          ["PURCHASES", "Purchases"],
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

      {/* PURCHASES (image #3 placeholder table layout) */}
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

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm">
                <option>Show 25 entries</option>
              </select>
              {/* <button className={pillBtn}>Export CSV</button>
              <button className={pillBtn}>Export Excel</button>
              <button className={pillBtn}>Print</button>
              <button className={pillBtn}>Column visibility</button>
              <button className={pillBtn}>Export PDF</button> */}
            </div>

            <input className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm" placeholder="Search ..." />
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

      {/* STOCK REPORT (image #4 placeholder layout) */}
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

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm">
                <option>Show 25 entries</option>
              </select>
              {/* <button className={pillBtn}>Export CSV</button>
              <button className={pillBtn}>Export Excel</button>
              <button className={pillBtn}>Print</button>
              <button className={pillBtn}>Column visibility</button>
              <button className={pillBtn}>Export PDF</button> */}
            </div>

            <input className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm" placeholder="Search ..." />
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

      {/* DOCS (same API) */}
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

      {/* PAYMENTS (same API) */}
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

      {/* ACTIVITIES (same API) */}
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
  );
}