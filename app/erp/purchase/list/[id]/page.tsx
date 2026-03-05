"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtPK(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}
function badge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "FINAL") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [row, setRow] = useState<any>(null);
  const [can, setCan] = useState<any>({ admin: false, cancel: false, delete: false });
  const [loading, setLoading] = useState(true);

  const [printedAt, setPrintedAt] = useState("");

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/purchases/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRow(null);
        return;
      }
      setRow(data.row);
      setCan(data.can || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }
  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  async function onCancel() {
    if (!can.cancel) return alert("Not allowed");
    if (!row || row.status !== "FINAL") return alert("Only FINAL can cancel");
    if (!confirm("Cancel this purchase? This will reverse stock + supplier due.")) return;

    const res = await fetch(`/api/erp/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");

    await load();
  }

  async function onDeleteDraft() {
    if (!can.delete) return alert("Not allowed");
    if (!row || row.status !== "DRAFT") return alert("Only DRAFT can delete");
    if (!confirm("Delete this DRAFT purchase?")) return;

    const res = await fetch(`/api/erp/purchases/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");

    window.location.href = "/erp/purchases";
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!row) return <div className="p-6 text-slate-500">Not found</div>;

  return (
    <div className="p-6 w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #purchase-print, #purchase-print * { visibility: visible !important; }
          #purchase-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4 no-print">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Purchase Detail</div>
            <div className="text-sm text-slate-500">Reference: {row.referenceNo}</div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className={pillBtn} onClick={onExportPdf}>Export PDF</button>
            <button className={pillBtn} onClick={onPrint}>Print</button>
{can.cancel && row.status === "FINAL" ? (
 <button
  key={`cancel-${row._id}-${row.status}`}
  type="button"
  className="rounded-xl px-4 py-2.5 !bg-rose-600 text-sm font-medium shadow-sm hover:!bg-rose-700 active:scale-[0.99] transition whitespace-nowrap"
  onClick={onCancel}
>
  <span className="!text-white">Cancel (Reverse)</span>
</button>
) : null}

            {can.delete && row.status === "DRAFT" ? (
              <button className="rounded-xl px-4 py-2.5 bg-rose-600 text-white text-sm font-medium shadow-sm hover:bg-rose-700" onClick={onDeleteDraft}>
                Delete Draft
              </button>
            ) : null}
          </div>
        </div>

        <div id="purchase-print" className="space-y-6">
          <div className="hidden print:block">
            <div className="text-lg font-semibold">Purchase Detail</div>
            <div className="text-sm">Reference: {row.referenceNo}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-slate-700 space-y-1">
                <div><b>Date:</b> {fmtPK(row.purchaseDate)}</div>
                <div><b>Supplier:</b> {row.supplierNameSnapshot || "-"}</div>
                <div><b>Location:</b> {row.locationName || "-"}</div>
              </div>

              <div className="text-sm text-slate-700 space-y-1">
                <div>
                  <b>Status:</b>{" "}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(row.status)}`}>
                    {row.status}
                  </span>
                </div>
                <div><b>Added By:</b> {row.createdBy?.name || row.createdBy?.email || "-"}</div>
                <div><b>Created At:</b> {fmtPK(row.createdAt)}</div>
                <div><b>Updated By:</b> {row.updatedBy?.name || row.updatedBy?.email || "-"}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Line Total</th>
                </tr>
              </thead>

              <tbody>
                {(row.items || []).map((it: any, idx: number) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{it.nameSnapshot || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{it.skuSnapshot || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{money(it.qty)}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(it.unitCost)}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="text-sm text-slate-700 space-y-1 text-right">
              <div><b>Subtotal:</b> Rs. {money(row.subtotal)}</div>
              <div><b>Shipping/Other:</b> Rs. {money(row.shippingCharges)}</div>
              <div className="text-base"><b>Grand Total:</b> Rs. {money(row.grandTotal)}</div>
            </div>

            {row.notes ? (
              <div className="mt-4 text-sm text-slate-700">
                <b>Notes:</b> {row.notes}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}