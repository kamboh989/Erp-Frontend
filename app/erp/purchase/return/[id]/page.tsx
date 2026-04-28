"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function PurchaseReturnViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [returnData, setReturnData] = useState<any>(null);
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
  }, []);

  useEffect(() => {
    if (!id) return;
    
    async function loadReturn() {
      setLoading(true);
      try {
        const res = await fetch(`/api/erp/purchase-returns/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          setReturnData(null);
          return;
        }
        
        setReturnData(data.row || null);
      } catch (error) {
        console.error("Error loading return:", error);
        setReturnData(null);
      } finally {
        setLoading(false);
      }
    }

    loadReturn();
  }, [id]);

  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-slate-500">Loading purchase return...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-slate-500">Purchase return not found</div>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #return-print,
          #return-print * {
            visibility: visible !important;
          }
          #return-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            border: 1px solid #ddd !important;
            margin-bottom: 8px !important;
            padding: 8px !important;
          }
          .print-label {
            font-size: 9px !important;
            font-weight: bold !important;
            color: #666 !important;
          }
          .print-value {
            font-size: 11px !important;
            color: #333 !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-2 text-indigo-600 hover:text-indigo-800 text-sm"
            >
              ← Back to Purchase Returns
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Purchase Return Details</h1>
            <p className="text-slate-600">Reference: {returnData.referenceNo}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm"
            >
              Print
            </button>
            <button
              onClick={onExportPdf}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div id="return-print" className="bg-white">
          {/* Print Header */}
          <div className="hidden print:block mb-4 text-center">
            <h1 className="text-xl font-bold">Purchase Return</h1>
            <p className="text-sm text-slate-600">Reference: {returnData.referenceNo}</p>
            <p className="text-xs text-slate-500">Printed: {printedAt}</p>
          </div>

          {/* Return Information */}
          <div className="print-section bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3 print-label">Return Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Reference No</div>
                <div className="print-value font-medium">{returnData.referenceNo}</div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Return Date</div>
                <div className="print-value">{fmtPK(returnData.returnDate)}</div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Status</div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${badge(returnData.status)}`}>
                    {returnData.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Location</div>
                <div className="print-value">{returnData.locationName || "-"}</div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="print-section bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3 print-label">Supplier Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Supplier Name</div>
                <div className="print-value font-medium">{returnData.supplierNameSnapshot || "-"}</div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Added By</div>
                <div className="print-value">{returnData.addedByName || "-"}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="print-section border border-slate-200 rounded-lg mb-4">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold print-label">Return Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-left font-semibold">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                    <th className="px-4 py-3 text-right font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(returnData.items || []).map((item: any, index: number) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-4 py-3 print-value">{item.nameSnapshot || "-"}</td>
                      <td className="px-4 py-3 print-value">{item.skuSnapshot || "-"}</td>
                      <td className="px-4 py-3 text-right print-value">{money(item.qty)}</td>
                      <td className="px-4 py-3 text-right print-value">Rs. {money(item.unitCost)}</td>
                      <td className="px-4 py-3 text-right print-value">Rs. {money(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="print-section bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3 print-label">Totals</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Subtotal</div>
                <div className="print-value font-medium">Rs. {money(returnData.subtotal)}</div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Shipping/Other Charges</div>
                <div className="print-value">Rs. {money(returnData.shippingCharges)}</div>
              </div>
              <div>
                <div className="print-label text-xs text-slate-500 mb-1">Grand Total</div>
                <div className="print-value text-lg font-bold text-indigo-600">Rs. {money(returnData.grandTotal)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {returnData.notes && (
            <div className="print-section bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold mb-3 print-label">Notes</h2>
              <div className="print-value">{returnData.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="print-section border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            <div>Created: {fmtPK(returnData.createdAt)}</div>
            <div className="hidden print:block mt-2">Generated on {printedAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}