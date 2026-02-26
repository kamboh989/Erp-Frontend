"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";

export function PayModal({
  open,
  onClose,
  contact,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contact: any;
  onSaved: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 16));
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/erp/customers/${contact._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          paidOn: new Date(paidOn).toISOString(),
          amount,
          note,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const selectBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const textareaBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition min-h-[100px]";

  const labelBase = "text-xs mb-1 text-slate-500";

  const btnBase = "px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99]";

  return (
    <Modal open={open} onClose={onClose} title="Add payment" widthClass="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500">Customer name</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {contact?.businessName || contact?.name}
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-sm text-slate-700 space-y-1">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Total Sale</span>
            <span className="font-medium">Rs {contact?.totals?.totalSaleDue ?? 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Total Paid</span>
            <span className="font-medium">Rs 0</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Total Sale Due</span>
            <span className="font-medium">Rs {contact?.totals?.totalSaleDue ?? 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Opening Balance</span>
            <span className="font-medium">Rs {contact?.totals?.openingBalanceDue ?? 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Opening Balance Due</span>
            <span className="font-medium">Rs {contact?.totals?.openingBalanceDue ?? 0}</span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-1">
          <div className={labelBase}>Payment Method *</div>
          <select className={selectBase} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>Bank</option>
            <option>Card</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className={labelBase}>Paid on *</div>
          <input
            type="datetime-local"
            className={inputBase}
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <div className={labelBase}>Amount *</div>
          <input
            type="number"
            className={inputBase}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <div className={labelBase}>Payment Note</div>
          <textarea className={textareaBase} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {/* Footer buttons */}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            className={
              btnBase + " bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
            }
            onClick={onClose}
          >
            Close
          </button>

          <button
            className={
              btnBase +
              " bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}