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

  return (
    <Modal open={open} onClose={onClose} title="Add payment" widthClass="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Customer name</div>
          <div className="font-semibold">{contact?.businessName || contact?.name}</div>
        </div>

        <div className="border rounded p-3 text-sm">
          <div><b>Total Sale:</b> Rs {contact?.totals?.totalSaleDue ?? 0}</div>
          <div><b>Total Paid:</b> Rs 0</div>
          <div><b>Total Sale Due:</b> Rs {contact?.totals?.totalSaleDue ?? 0}</div>
          <div><b>Opening Balance:</b> Rs {contact?.totals?.openingBalanceDue ?? 0}</div>
          <div><b>Opening Balance Due:</b> Rs {contact?.totals?.openingBalanceDue ?? 0}</div>
        </div>

        <div>
          <div className="text-xs mb-1">Payment Method *</div>
          <select className="w-full border rounded px-2 py-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>Bank</option>
            <option>Card</option>
          </select>
        </div>

        <div>
          <div className="text-xs mb-1">Paid on *</div>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-2"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs mb-1">Amount *</div>
          <input
            type="number"
            className="w-full border rounded px-2 py-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs mb-1">Payment Note</div>
          <textarea className="w-full border rounded px-2 py-2 min-h-[100px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>Close</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}