"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function UnitViewPage() {
  const params = useParams();
  const id = String(params.id);

  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printedAt, setPrintedAt] = useState("");

  async function loadUnit() {
    try {
      const res = await fetch(`/api/erp/units/${id}`, { cache: "no-store" });
      
      if (!res.ok) {
        console.error("API Error:", res.status, res.statusText);
        return;
      }
      
      const text = await res.text();
      if (!text) {
        console.error("Empty response from API");
        return;
      }
      
      const data = JSON.parse(text);
      setUnit(data.row || data);
    } catch (error) {
      console.error("Failed to load unit:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    loadUnit();
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

  if (!unit) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-slate-500">Unit not found</div>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #unit-detail-print, #unit-detail-print * { visibility: visible !important; }
          #unit-detail-print { 
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
            padding: 15px !important;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            page-break-inside: avoid !important;
          }
          
          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
          }
          
          .print-field {
            margin-bottom: 12px !important;
          }
          
          .print-label {
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #666 !important;
            margin-bottom: 4px !important;
          }
          
          .print-value {
            font-size: 12px !important;
            color: #000 !important;
            font-weight: 500 !important;
          }
          
          .print-header {
            text-align: center !important;
            margin-bottom: 25px !important;
            padding-bottom: 15px !important;
            border-bottom: 2px solid #000 !important;
          }
          
          .print-title {
            font-size: 20px !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
          }
          
          .print-subtitle {
            font-size: 16px !important;
            margin-bottom: 5px !important;
          }
          
          .print-meta {
            font-size: 9px !important;
            color: #666 !important;
          }
          
          .print-section-title {
            font-size: 14px !important;
            font-weight: bold !important;
            margin-bottom: 12px !important;
            color: #000 !important;
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 5px !important;
          }
          
          .print-status {
            display: inline-block !important;
            padding: 3px 8px !important;
            border-radius: 4px !important;
            font-size: 9px !important;
            font-weight: 600 !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 20mm 15mm;
          }
        }
      `}</style>

      <div id="unit-detail-print">
        <div className="hidden print:block print-header">
          <div className="print-title">Unit Detail Report</div>
          <div className="print-subtitle">{unit.name || "Unit"}</div>
          <div className="print-meta">Short: {unit.short || "N/A"} | Printed: {printedAt || "-"}</div>
        </div>

        {/* Header with Print Buttons */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{unit.name || "Unit"}</div>
              <div className="text-sm text-slate-500 mt-1">Short: {unit.short || "N/A"}</div>
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

        {/* Unit Information */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-section">
          <div className="text-lg font-semibold text-slate-800 mb-4 print-section-title">Unit Information</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
            <div className="space-y-4">
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Unit Name</div>
                <div className="text-slate-900 print-value">{unit.name || "N/A"}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Short Name</div>
                <div className="text-slate-900 print-value">{unit.short || "N/A"}</div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Allow Decimal</div>
                <div className="text-slate-900 print-value">
                  <span className={`px-2 py-1 rounded-full text-xs print-status ${
                    unit.allowDecimal 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {unit.allowDecimal ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Status</div>
                <div className="text-slate-900 print-value">
                  <span className={`px-2 py-1 rounded-full text-xs print-status ${
                    unit.isActive 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {unit.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Created At</div>
                <div className="text-slate-900 print-value">
                  {unit.createdAt ? new Date(unit.createdAt).toLocaleString() : "-"}
                </div>
              </div>
              
              <div className="print-field">
                <div className="text-sm font-medium text-slate-600 print-label">Updated At</div>
                <div className="text-slate-900 print-value">
                  {unit.updatedAt ? new Date(unit.updatedAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print-section">
          <div className="text-lg font-semibold text-slate-800 mb-4 print-section-title">Usage Information</div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="print-field">
              <div className="text-sm font-medium text-slate-600 print-label">Decimal Support</div>
              <div className="text-slate-900 print-value">
                {unit.allowDecimal 
                  ? "This unit supports decimal quantities (e.g., 1.5 kg, 2.75 liters)" 
                  : "This unit only supports whole numbers (e.g., 1 piece, 5 boxes)"}
              </div>
            </div>
            
            <div className="print-field">
              <div className="text-sm font-medium text-slate-600 print-label">Display Format</div>
              <div className="text-slate-900 print-value">
                Quantities will be displayed as: <strong>100 {unit.short || "units"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}