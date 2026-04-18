"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Item = {
  nameSnapshot?: string;
  skuSnapshot?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
};

type StockTransfer = {
  _id: string;
  referenceNo?: string;
  transferDate?: string | Date;
  status?: string;
  fromLocationName?: string;
  toLocationName?: string;
  shippingCharges?: number;
  subtotal?: number;
  grandTotal?: number;
  notes?: string;
  createdBy?: { name?: string; email?: string };
  updatedBy?: { name?: string; email?: string };
  createdAt?: string | Date;
  updatedAt?: string | Date;
  items?: Item[];
};

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
function badge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (s === "IN_TRANSIT") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function StockTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [row, setRow] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/erp/stock-transfers/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.row) {
          setRow(null);
          return;
        }
        setRow(data.row);
      } finally {
        setLoading(false);
      }
    }
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    load();
  }, [id]);

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!row) return <div className="p-6 text-slate-500">Stock transfer not found.</div>;

  return (
    <div className="p-6 w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #stock-transfer-detail-print, #stock-transfer-detail-print * { visibility: visible !important; }
          #stock-transfer-detail-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4 no-print">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Stock Transfer</div>
            <div className="text-sm text-slate-500">Reference: {row.referenceNo}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50" onClick={onPrint}>
              Print
            </button>
            <button
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => router.push(`/erp/stock-transfers/new?id=${id}`)}
            >
              Edit
            </button>
            <button className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => router.push("/erp/stock-transfers")}>
              Back
            </button>
          </div>
        </div>

        <div id="stock-transfer-detail-print" className="space-y-6">
          <div className="hidden print:block">
            <div className="text-lg font-semibold">Stock Transfer</div>
            <div className="text-sm">Reference: {row.referenceNo}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm text-slate-700">
                <div><b>Transfer Date:</b> {fmtPK(row.transferDate)}</div>
                <div><b>From Location:</b> {row.fromLocationName || "-"}</div>
                <div><b>To Location:</b> {row.toLocationName || "-"}</div>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <b>Status:</b> <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(row.status)}`}>{row.status}</span>
                </div>
                <div><b>Shipping Charges:</b> Rs. {money(row.shippingCharges)}</div>
                <div><b>Grand Total:</b> Rs. {money(row.grandTotal)}</div>
              </div>
            </div>
            {row.notes ? (
              <div className="mt-4 text-sm text-slate-600">
                <div className="font-semibold">Notes</div>
                <div>{row.notes}</div>
              </div>
            ) : null}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {row.items?.length ? (
                  row.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 font-medium">{item.nameSnapshot || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.skuSnapshot || "-"}</td>
                      <td className="px-4 py-3 text-right">{money(item.qty)}</td>
                      <td className="px-4 py-3 text-right">Rs. {money(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right">Rs. {money(item.lineTotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>No products added</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-sm text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><b>Created At:</b> {fmtPK(row.createdAt)}</div>
              <div><b>Updated At:</b> {fmtPK(row.updatedAt)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div><b>Created By:</b> {row.createdBy?.name || row.createdBy?.email || "-"}</div>
              <div><b>Updated By:</b> {row.updatedBy?.name || row.updatedBy?.email || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
