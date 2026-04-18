"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type QuotationItem = {
  nameSnapshot?: string;
  skuSnapshot?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
};

type QuotationRow = {
  _id: string;
  quotationDate?: string | Date;
  expiryDate?: string | Date;
  referenceNo?: string;
  customerNameSnapshot?: string;
  locationName?: string;
  status?: string;
  createdBy?: { name?: string; email?: string };
  updatedBy?: { name?: string; email?: string };
  createdAt?: string | Date;
  updatedAt?: string | Date;
  items?: QuotationItem[];
  notes?: string;
  shippingCharges?: number;
  subtotal?: number;
  grandTotal?: number;
};

function money(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtPK(v: string | Date | number | undefined | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}
function badge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "SENT") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "EXPIRED") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function QuotationDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [row, setRow] = useState<QuotationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [printedAt, setPrintedAt] = useState("");
  const [can, setCan] = useState<{ admin: boolean; update: boolean; delete: boolean }>({
    admin: false,
    update: false,
    delete: false,
  });
  const [actionOpen, setActionOpen] = useState(false);

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/quotations/${id}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        row?: QuotationRow;
        can?: { admin: boolean; update: boolean; delete: boolean };
      };
      if (!res.ok) {
        setRow(null);
        return;
      }
      setRow(data.row || null);
      setCan({
        admin: Boolean(data.can?.admin),
        update: Boolean(data.can?.update),
        delete: Boolean(data.can?.delete),
      });
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

  async function deleteQuotation() {
    if (!can.delete) return alert("Not allowed");
    if (row?.status !== "DRAFT") return alert("Only DRAFT quotations can be deleted");
    if (!confirm("Delete this DRAFT quotation?")) return;

    const res = await fetch(`/api/erp/quotations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");
    window.location.href = "/erp/sales/quotations";
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!row) return <div className="p-6 text-slate-500">Not found</div>;

  return (
    <div className="p-6 w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #quotation-print, #quotation-print * { visibility: visible !important; }
          #quotation-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4 no-print">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Quotation Detail</div>
            <div className="text-sm text-slate-500">Reference: {row.referenceNo}</div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className={pillBtn} onClick={onExportPdf}>Export PDF</button>
            <button className={pillBtn} onClick={onPrint}>Print</button>
            {row.status === "DRAFT" ? (
              <>
                <button
                  type="button"
                  className="rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition whitespace-nowrap"
                  onClick={() => (window.location.href = `/erp/sales/quotations/new?id=${id}`)}
                >
                  Edit
                </button>
                {can.delete ? (
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2.5 bg-rose-600 text-white text-sm font-medium shadow-sm hover:bg-rose-700 active:scale-[0.99] transition whitespace-nowrap"
                    onClick={deleteQuotation}
                  >
                    Delete
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div id="quotation-print" className="space-y-6">
          <div className="hidden print:block">
            <div className="text-lg font-semibold">Quotation Detail</div>
            <div className="text-sm">Reference: {row.referenceNo}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-slate-700 space-y-1">
                <div><b>Quotation Date:</b> {fmtPK(row.quotationDate)}</div>
                <div><b>Expiry Date:</b> {fmtPK(row.expiryDate)}</div>
                <div><b>Customer:</b> {row.customerNameSnapshot || "-"}</div>
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

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Line Total</th>
                </tr>
              </thead>

              <tbody>
                {(row.items || []).map((it: QuotationItem, idx: number) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{it.nameSnapshot || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{it.skuSnapshot || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{money(it.qty)}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(it.unitPrice)}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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