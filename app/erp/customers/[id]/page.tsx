"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CustomerViewHeader } from "@/app/components/customers/CustomerViewHeader";
import { NotesModal } from "@/app/components/customers/NotesModal";
import { ContactPersonsPanel } from "@/app/components/customers/ContactPersonsPanel";
import { getCustomerBalance } from "@/lib/contactTotals";

type Tab =
  | "LEDGER"
  | "SALES"
  | "DOCS"
  | "PAYMENTS"
  | "ACTIVITIES"
  | "CONTACT_PERSONS";

export default function CustomerViewPage() {
  const params = useParams();
  const id = String(params.id);

  const [contact, setContact] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("LEDGER");

  const [notesOpen, setNotesOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInvoice: 0,
    totalPaid: 0,
    balanceDue: 0,
    advance: 0,
  });
  const [printedAt, setPrintedAt] = useState("");

  function buildLedger(nextContact: any, nextPayments: any[]) {
    const rows: any[] = [];

    const opening =
      Number(
        nextContact?.moreInfo?.openingBalance ??
          nextContact?.totals?.openingBalanceDue ??
          0,
      ) || 0;

    const advance =
      Number(nextContact?.totals?.advanceBalance ?? 0) || 0;

    const totalSaleDue = Number(nextContact?.totals?.totalSaleDue ?? 0) || 0;
    const totalSaleReturnDue = Number(nextContact?.totals?.totalSaleReturnDue ?? 0) || 0;

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

    if (totalSaleDue > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Sales Due",
        ref: "-",
        debit: totalSaleDue,
        credit: 0,
        method: "-",
        note: "Total sales due",
      });
    }

    if (totalSaleReturnDue > 0) {
      rows.push({
        date: nextContact?.createdAt || new Date().toISOString(),
        type: "Sale Return",
        ref: "-",
        debit: 0,
        credit: totalSaleReturnDue,
        method: "-",
        note: "Sale returns",
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

    rows.sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);

    const totalInvoice = totalSaleDue;
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
    const res = await fetch(`/api/erp/customers/${id}`);
    const data = await res.json();
    setContact(data.contact);
    buildLedger(data.contact, payments);
  }

  async function loadPayments() {
    const res = await fetch(`/api/erp/customers/${id}/payments`);
    const data = await res.json();
    const rows = data.rows || [];
    setPayments(rows);
    if (contact) buildLedger(contact, rows);
  }

  async function loadNotes() {
    const res = await fetch(`/api/erp/customers/${id}/notes`);
    const data = await res.json();
    setNotes(data.rows || []);
  }

  async function loadActivities() {
    const res = await fetch(`/api/erp/customers/${id}/activities`);
    const data = await res.json();
    setActivities(data.rows || []);
  }

  async function loadSalesOrders() {
    setSalesLoading(true);
    try {
      const res = await fetch(`/api/erp/customers/${id}/sales`);
      const data = await res.json();
      setSalesOrders(data.rows || []);
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    loadContact();
  }, [id]);

  useEffect(() => {
    if (!contact) return;

    if (tab === "PAYMENTS") loadPayments();
    if (tab === "DOCS") loadNotes();
    if (tab === "ACTIVITIES") loadActivities();
    if (tab === "LEDGER") loadPayments();
    if (tab === "SALES") loadSalesOrders();
  }, [tab, contact]);

  if (!contact)
    return <div className="p-6 text-slate-500">Loading...</div>;

  const canEdit = true;

  const tableHead =
    "px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide";
  const tableCell =
    "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

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
    <div className="p-6 space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #customer-detail-print, #customer-detail-print * { visibility: visible !important; }
          #customer-detail-print { 
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

      <div id="customer-detail-print">
      <div className="hidden print:block mb-3">
        <div className="text-lg font-semibold">Customer Detail</div>
        <div className="text-sm">{contact.businessName || contact.name}</div>
        <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
      </div>

      <div className="no-print">
        <CustomerViewHeader current={contact} />
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="text-sm text-slate-700 space-y-1">
            <div><b>Customer:</b> {contact.businessName || contact.name}</div>
            <div><b>Mobile:</b> {contact.mobile}</div>
            <div><b>Address:</b> {contact.moreInfo?.billingAddress?.line1 || "-"}</div>
          </div>
          <div className="text-sm text-slate-700 space-y-1">
            <div><b>Total Sales Due:</b> Rs. {Number(contact.totals?.totalSaleDue || 0)}</div>
            <div><b>Sale Returns:</b> Rs. {Number(contact.totals?.totalSaleReturnDue || 0)}</div>
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
      <div className="border-b border-slate-200 flex gap-4 text-sm">
        {[
          ["LEDGER", "Ledger"],
          ["SALES", "Sales"],
          ["DOCS", "Documents & Note"],
          ["PAYMENTS", "Payments"],
          ["ACTIVITIES", "Activities"],
          ["CONTACT_PERSONS", "Contact Persons"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`px-3 py-2 -mb-px border-b-2 transition ${
              tab === k
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab(k as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ========== ALL TABS FULLY WORKING BELOW (UI POLISHED ONLY) ========== */}

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
                      <td className={tableCell}>{new Date(r.date).toLocaleString()}</td>
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

      {/* SALES */}
      {tab === "SALES" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-800">Sales Orders & Invoices</div>
            <div className="text-xs text-slate-500">
              {salesLoading ? "Loading..." : `${salesOrders.length} records`}
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
                {salesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                      Loading sales data...
                    </td>
                  </tr>
                ) : salesOrders.length ? (
                  salesOrders.map((sale: any) => (
                    <tr key={sale._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={tableCell}>{new Date(sale.date).toLocaleDateString()}</td>
                      <td className={tableCell}>{sale.referenceNo}</td>
                      <td className={tableCell}>{sale.type}</td>
                      <td className={tableCell}>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {sale.status}
                        </span>
                      </td>
                      <td className={tableCell}>Rs. {sale.amount}</td>
                      <td className={tableCell}>Rs. {sale.dueAmount}</td>
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
                        <div>No sales records found for this customer</div>
                        <div className="text-xs text-slate-400">
                          Sales orders and invoices will appear here when the sales module is integrated
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
                <div className="text-xs text-slate-500">Total Sales</div>
                <div className="font-semibold">Rs. {Number(contact.totals?.totalSaleDue || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Sale Returns</div>
                <div className="font-semibold text-orange-600">Rs. {Number(contact.totals?.totalSaleReturnDue || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Net Due</div>
                <div className="font-semibold text-red-600">
                  Rs. {Math.max(0, (Number(contact.totals?.totalSaleDue || 0) - Number(contact.totals?.totalSaleReturnDue || 0) - Number(contact.totals?.advanceBalance || 0)))}
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
                      <td className={tableCell}>{new Date(n.createdAt).toLocaleString()}</td>
                      <td className={tableCell}>{new Date(n.updatedAt).toLocaleString()}</td>
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

          <NotesModal
            open={notesOpen}
            onClose={() => setNotesOpen(false)}
            contactId={contact._id}
            onSaved={loadNotes}
          />
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
                      <td className={tableCell}>{new Date(p.paidOn).toLocaleString()}</td>
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
                      <td className={tableCell}>{new Date(a.createdAt).toLocaleString()}</td>
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
      {tab === "CONTACT_PERSONS" && (
        <ContactPersonsPanel
          contact={contact}
          onUpdated={loadContact}
          canEdit={canEdit}
        />
      )}
      </div>
    </div>
  );
}