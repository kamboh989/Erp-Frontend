"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CustomerViewHeader } from "@/app/components/customers/CustomerViewHeader";
import { NotesModal } from "@/app/components/customers/NotesModal";
import { ContactPersonsPanel } from "@/app/components/customers/ContactPersonsPanel";

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

  // ✅ Ledger
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInvoice: 0,
    totalPaid: 0,
    balanceDue: 0,
    advance: 0,
  });

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

    // Opening balance -> Debit
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

    // Advance balance snapshot (optional) -> Credit
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

    // Payments -> Credit (professional: without invoice => advance payment)
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

    // sort by date asc
    rows.sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const totalDebit = rows.reduce(
      (s, r) => s + (Number(r.debit) || 0),
      0,
    );
    const totalCredit = rows.reduce(
      (s, r) => s + (Number(r.credit) || 0),
      0,
    );

    // Sales/Invoices module not integrated yet => 0
    const totalInvoice = 0;

    // At this stage paid = total credits (advance + payments)
    const totalPaid = totalCredit;

    // balanceDue = debit - credit
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

    // ✅ rebuild ledger using existing payments state
    buildLedger(data.contact, payments);
  }

  async function loadPayments() {
    const res = await fetch(`/api/erp/customers/${id}/payments`);
    const data = await res.json();
    const rows = data.rows || [];
    setPayments(rows);

    // ✅ rebuild ledger if contact already loaded
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

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!contact) return;

    if (tab === "PAYMENTS") loadPayments();
    if (tab === "DOCS") loadNotes();
    if (tab === "ACTIVITIES") loadActivities();

    // ✅ ledger needs payments too
    if (tab === "LEDGER") loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contact]);

  if (!contact) return <div className="p-4">Loading...</div>;

  // very simple permission hint from server? (You can return in GET)
  const canEdit = true; // later: from session/role

  return (
    <div className="p-4">
      <CustomerViewHeader current={contact} />

      {/* Top summary like image */}
      <div className="mt-4 border rounded p-3 flex items-center justify-between">
        <div className="text-sm">
          <div>
            <b>Customer:</b> {contact.businessName || contact.name}
          </div>
          <div>
            <b>Mobile:</b> {contact.mobile}
          </div>
          <div>
            <b>Address:</b>{" "}
            {contact.moreInfo?.billingAddress?.line1 || "-"}
          </div>
        </div>

        <button className="px-4 py-2 rounded bg-blue-600 text-white">
          Add Discount
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 border-b flex gap-4 text-sm">
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
            className={`px-3 py-2 -mb-px border-b-2 ${
              tab === k
                ? "border-blue-600 font-semibold"
                : "border-transparent text-gray-600"
            }`}
            onClick={() => setTab(k as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === "LEDGER" && (
          <div className="border rounded p-3">
            <div className="text-sm font-semibold mb-2">Ledger</div>

            <div className="mt-3 border rounded p-3">
              <div className="font-semibold text-sm mb-2">
                Account Summary
              </div>

              <div className="text-sm">
                Total invoice: Rs {ledgerSummary.totalInvoice}
              </div>
              <div className="text-sm">
                Total paid: Rs {ledgerSummary.totalPaid}
              </div>

              {ledgerSummary.balanceDue >= 0 ? (
                <div className="text-sm">
                  Balance due: Rs {ledgerSummary.balanceDue}
                </div>
              ) : (
                <div className="text-sm">
                  Advance (customer has extra): Rs {ledgerSummary.advance}
                </div>
              )}
            </div>

            <div className="mt-3 border rounded overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Ref</th>
                    <th className="p-2 text-left">Debit</th>
                    <th className="p-2 text-left">Credit</th>
                    <th className="p-2 text-left">Method</th>
                    <th className="p-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length ? (
                    ledgerRows.map((r: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          {r.date
                            ? new Date(r.date).toLocaleString()
                            : "-"}
                        </td>
                        <td className="p-2">{r.type}</td>
                        <td className="p-2">{r.ref || "-"}</td>
                        <td className="p-2">Rs {r.debit || 0}</td>
                        <td className="p-2">Rs {r.credit || 0}</td>
                        <td className="p-2">{r.method || "-"}</td>
                        <td className="p-2">{r.note || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3" colSpan={7}>
                        No ledger entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "SALES" && (
          <div className="border rounded p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-sm font-semibold">Sales</div>
              <div className="text-xs text-gray-500">
                (same table style as image 8)
              </div>
            </div>
            <div className="border rounded p-3 text-sm text-gray-600">
              No data available in table (placeholder until Sales module)
            </div>
          </div>
        )}

        {tab === "DOCS" && (
          <div className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                Documents & Note
              </div>
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white"
                onClick={() => setNotesOpen(true)}
              >
                + Add
              </button>
            </div>

            <div className="mt-3 border rounded overflow-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Heading</th>
                    <th className="p-2 text-left">Added By</th>
                    <th className="p-2 text-left">Created At</th>
                    <th className="p-2 text-left">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.length ? (
                    notes.map((n: any) => (
                      <tr key={n._id} className="border-t">
                        <td className="p-2">{n.heading}</td>
                        <td className="p-2">
                          {String(n.createdBy || "-")}
                        </td>
                        <td className="p-2">
                          {new Date(n.createdAt).toLocaleString()}
                        </td>
                        <td className="p-2">
                          {new Date(n.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3" colSpan={4}>
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

        {tab === "PAYMENTS" && (
          <div className="border rounded p-3">
            <div className="text-sm font-semibold mb-3">Payments</div>

            {/* top filters like image 11 */}
            <div className="border rounded p-3 flex flex-wrap gap-3 items-center text-sm">
              <div>
                <div className="text-xs mb-1">Payment Status</div>
                <select className="border rounded px-2 py-2">
                  <option>All</option>
                </select>
              </div>
              <div>
                <div className="text-xs mb-1">Date Range</div>
                <input
                  className="border rounded px-2 py-2"
                  value="01/01/2026 - 12/31/2026"
                  readOnly
                />
              </div>
              <label className="flex items-center gap-2 mt-5">
                <input type="checkbox" />
                Subscriptions
              </label>
            </div>

            <div className="mt-3 border rounded overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Paid on</th>
                    <th className="p-2 text-left">Reference No</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Payment Method</th>
                    <th className="p-2 text-left">Payment For</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length ? (
                    payments.map((p: any) => (
                      <tr key={p._id} className="border-t">
                        <td className="p-2">
                          {new Date(p.paidOn).toLocaleString()}
                        </td>
                        <td className="p-2">{p.referenceNo || "-"}</td>
                        <td className="p-2">Rs {p.amount}</td>
                        <td className="p-2">{p.paymentMethod}</td>
                        <td className="p-2">{p.paymentFor || "-"}</td>
                        <td className="p-2">-</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3" colSpan={6}>
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "ACTIVITIES" && (
          <div className="border rounded p-3">
            <div className="text-sm font-semibold mb-3">Activities</div>
            <div className="border rounded overflow-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">By</th>
                    <th className="p-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length ? (
                    activities.map((a: any) => (
                      <tr key={a._id} className="border-t">
                        <td className="p-2">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                        <td className="p-2">{a.action}</td>
                        <td className="p-2">{String(a.by)}</td>
                        <td className="p-2">
                          {a.meta?.heading ||
                            a.meta?.amount ||
                            "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3" colSpan={4}>
                        No data available in table
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "CONTACT_PERSONS" && (
          <div className="border rounded p-3">
            <ContactPersonsPanel
              contact={contact}
              onUpdated={loadContact}
              canEdit={canEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
}