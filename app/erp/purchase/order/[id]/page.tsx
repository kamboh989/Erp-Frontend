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

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    if (!id) return;
    
    async function loadOrder() {
      try {
        const res = await fetch(`/api/erp/purchase/order/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          setError(data?.error || "Failed to load order");
          return;
        }
        
        setOrder(data.row || data);
      } catch (err) {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
  }, []);

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-slate-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 w-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-rose-600 mb-4">{error || "Order not found"}</div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #po-detail-print, #po-detail-print * { visibility: visible !important; }
          #po-detail-print { 
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
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>
      <div id="po-detail-print" className="max-w-4xl mx-auto space-y-6">
        <div className="hidden print:block mb-3">
          <div className="text-lg font-semibold">Purchase Order Details</div>
          <div className="text-sm">Reference: {order.referenceNo}</div>
          <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
        </div>

        <div className="no-print flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Purchase Order Details</h1>
            <p className="text-sm text-slate-500">View purchase order information</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
            >
              Back
            </button>
            <button
              onClick={() => {
                setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
                window.print();
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
            >
              Export PDF
            </button>
            <button
              onClick={() => {
                setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
                window.print();
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
            >
              Print
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print:shadow-none print:border-slate-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Reference No:</span>
                  <span className="font-medium">{order.referenceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Order Date:</span>
                  <span className="font-medium">{fmtPK(order.orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Status:</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${badge(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Location:</span>
                  <span className="font-medium">{order.locationName || "-"}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Supplier Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Name:</span>
                  <span className="font-medium">{order.supplierNameSnapshot || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Mobile:</span>
                  <span className="font-medium">{order.supplierMobileSnapshot || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Email:</span>
                  <span className="font-medium">{order.supplierEmailSnapshot || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{order.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Unit Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productNameSnapshot}</td>
                      <td className="px-4 py-3 text-slate-600">{item.productSkuSnapshot}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{money(item.qty)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">Rs {money(item.unitCost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        Rs {money(item.qty) * money(item.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      Rs {money(order.subtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}