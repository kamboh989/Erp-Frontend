"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProductViewPage() {
  const params = useParams();
  const id = String(params.id);

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printedAt, setPrintedAt] = useState("");

  async function loadProduct() {
    try {
      const res = await fetch(`/api/erp/listProduct/${id}`, { cache: "no-store" });
      const data = await res.json();
      
      if (data.row) {
        // Transform the API response to match our component expectations
        const productData = {
          ...data.row,
          category: data.row.categoryId,
          unit: data.row.unitId
        };
        setProduct(productData);
      } else {
        console.error("Product not found in API response:", data);
      }
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    loadProduct();
  }, [id]);

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

  if (loading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-slate-500">Product not found</div>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  console.log("Product data:", product); // Debug log

  return (
    <div className="p-6 space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #product-detail-print, #product-detail-print * { visibility: visible !important; }
          #product-detail-print { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          .no-print { display: none !important; visibility: hidden !important; }
          
          /* Compact layout for single page */
          .print-section {
            margin-bottom: 15px !important;
            padding: 10px !important;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            page-break-inside: avoid !important;
          }
          
          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
          }
          
          .print-grid-3 {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 10px !important;
          }
          
          .print-field {
            margin-bottom: 8px !important;
          }
          
          .print-label {
            font-size: 9px !important;
            font-weight: 600 !important;
            color: #666 !important;
            margin-bottom: 2px !important;
          }
          
          .print-value {
            font-size: 11px !important;
            color: #000 !important;
            font-weight: 500 !important;
          }
          
          .print-header {
            text-align: center !important;
            margin-bottom: 20px !important;
            padding-bottom: 10px !important;
            border-bottom: 2px solid #000 !important;
          }
          
          .print-title {
            font-size: 18px !important;
            font-weight: bold !important;
            margin-bottom: 5px !important;
          }
          
          .print-subtitle {
            font-size: 14px !important;
            margin-bottom: 3px !important;
          }
          
          .print-meta {
            font-size: 8px !important;
            color: #666 !important;
          }
          
          .print-section-title {
            font-size: 12px !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
            color: #000 !important;
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 3px !important;
          }
          
          .print-status {
            display: inline-block !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 8px !important;
            font-weight: 600 !important;
          }
          
          .print-alert {
            background-color: #fee !important;
            border: 1px solid #fcc !important;
            padding: 8px !important;
            border-radius: 4px !important;
            margin-top: 10px !important;
            font-size: 9px !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 15mm 10mm;
          }
        }
      `}</style>

      <div id="product-detail-print">
        <div className="hidden print:block print-header">
          <div className="print-title">Product Detail Report</div>
          <div className="print-subtitle">{product.name || "Product"}</div>
          <div className="print-meta">SKU: {product.sku || "N/A"} | Printed: {printedAt || "-"}</div>
        </div>

        {/* Header with Print Buttons */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{product.name || "Product"}</div>
              <div className="text-sm text-slate-500 mt-1">SKU: {product.sku || "N/A"}</div>
            </div>
            <div className="no-print flex gap-2">
              <button className={pillBtn} onClick={onExportPdf}>
                Export PDF
              </button>
              <button className={pillBtn} onClick={onPrint}>
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-section">
          <div className="text-lg font-semibold text-slate-800 mb-4 print-section-title">Product Information</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
            <div className="space-y-4">
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Product Name</div>
                <div className="text-slate-900 print-value">{product.name || "N/A"}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">SKU</div>
                <div className="text-slate-900 print-value">{product.sku || "N/A"}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Category</div>
                <div className="text-slate-900 print-value">{product.category?.name || product.categoryId?.name || "-"}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Unit</div>
                <div className="text-slate-900 print-value">
                  {product.unit?.name || product.unitId?.name ? 
                    `${product.unit?.name || product.unitId?.name} (${product.unit?.short || product.unitId?.short || ""})` : "-"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Purchase Price</div>
                <div className="text-slate-900 print-value">Rs. {Number(product.purchasePrice || 0).toLocaleString()}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Selling Price</div>
                <div className="text-slate-900 print-value">Rs. {Number(product.sellingPrice || 0).toLocaleString()}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Manage Stock</div>
                <div className="text-slate-900 print-value">
                  <span className={`px-2 py-1 rounded-full text-xs print-status ${
                    product.manageStock 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {product.manageStock ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Status</div>
                <div className="text-slate-900 print-value">
                  <span className={`px-2 py-1 rounded-full text-xs print-status ${
                    product.isActive 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Information */}
        {product.manageStock && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-section">
            <div className="text-lg font-semibold text-slate-800 mb-4 print-section-title">Stock Information</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-grid-3">
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Opening Stock</div>
                <div className="text-slate-900 print-value">
                  {Number(product.openingStock || 0).toLocaleString()} {product.unit?.short || product.unitId?.short || ""}
                </div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Current Stock</div>
                <div className="text-slate-900 print-value">
                  {Number(product.currentStock || 0).toLocaleString()} {product.unit?.short || product.unitId?.short || ""}
                </div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Alert Quantity</div>
                <div className="text-slate-900 print-value">
                  {Number(product.alertQty || 0).toLocaleString()} {product.unit?.short || product.unitId?.short || ""}
                </div>
              </div>
            </div>

            {Number(product.currentStock || 0) <= Number(product.alertQty || 0) && Number(product.alertQty || 0) > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg print-alert">
                <div className="text-sm text-red-800 font-medium">⚠️ Low Stock Alert</div>
                <div className="text-sm text-red-600">
                  Current stock is at or below the alert quantity.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-section">
          <div className="text-lg font-semibold text-slate-800 mb-4 print-section-title">Additional Information</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
            <div className="print-field">
              <div className="text-sm font-medium text-slate-600 print-label">Created At</div>
              <div className="text-slate-900 print-value">
                {product.createdAt ? new Date(product.createdAt).toLocaleString() : "-"}
              </div>
            </div>
            
            <div className="print-field">
              <div className="text-sm font-medium text-slate-600 print-label">Updated At</div>
              <div className="text-slate-900 print-value">
                {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}