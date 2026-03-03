"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProductRow = {
  _id: string;
  name: string;
  sku: string;

  category?: { _id: string; name: string } | null;
  unit?: { _id: string; name: string; short: string } | null;

  manageStock: boolean;
  openingStock: number;
  currentStock: number; // ✅ must exist if manageStock ON
  alertQty: number;

  purchasePrice: number;
  sellingPrice: number;

  isActive: boolean;
  lowStock?: boolean; // backend helper (optional)
};

type StockRow = {
  _id: string;
  sku: string;
  name: string;

  categoryName: string;
  unitName: string;
  unitShort: string;

  manageStock: boolean;
  currentStock: number;

  purchasePrice: number;
  sellingPrice: number;

  stockValuePurchase: number;
  stockValueSale: number;
};

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<"ALL" | "STOCK">("ALL");

  // filters
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // pagination (All products only)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // meta (categories dropdown)
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);

  // all products
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);

  // stock report
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockTotals, setStockTotals] = useState<{ purchase: number; sale: number }>({ purchase: 0, sale: 0 });

  const [loading, setLoading] = useState(false);

  // column visibility (ALL tab)
  type AllColKey = "name" | "sku" | "category" | "unit" | "purchasePrice" | "sellingPrice" | "currentStock";
  const [colsOpen, setColsOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState<Record<AllColKey, boolean>>({
    name: true,
    sku: true,
    category: true,
    unit: true,
    purchasePrice: true,
    sellingPrice: true,
    currentStock: true,
  });

  // print/pdf
  const [printedAt, setPrintedAt] = useState("");
  useEffect(() => setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })), []);
  function onPrint() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }
  function onExportPdf() {
    setPrintedAt(new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
    window.print();
  }

  // action dropdown state
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);

  // opening stock modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalRow, setStockModalRow] = useState<ProductRow | null>(null);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition";

  // exports (CSV/Excel endpoints optional — abhi tumhare pass nahi bhi hon to remove kar sakte ho)
  const exportAllCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (categoryId) sp.set("categoryId", categoryId);
    return `/api/erp/listProduct/export/csv?${sp.toString()}`;
  }, [q, categoryId]);

  const exportAllExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (categoryId) sp.set("categoryId", categoryId);
    return `/api/erp/listProduct/export/excel?${sp.toString()}`;
  }, [q, categoryId]);

  const exportStockCsvUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (categoryId) sp.set("categoryId", categoryId);
    return `/api/erp/listProduct/stock-report/export/csv?${sp.toString()}`;
  }, [q, categoryId]);

  const exportStockExcelUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (categoryId) sp.set("categoryId", categoryId);
    return `/api/erp/listProduct/stock-report/export/excel?${sp.toString()}`;
  }, [q, categoryId]);

  function toggleCol(k: AllColKey) {
    setCols((p) => ({ ...p, [k]: !p[k] }));
  }

  async function loadCategories() {
    try {
      const res = await fetch(`/api/erp/categories?page=1&limit=500`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setCategories(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setCategories([]);
    }
  }

  async function loadAllProducts() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());
      if (categoryId) sp.set("categoryId", categoryId);

      const res = await fetch(`/api/erp/listProduct?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
    } finally {
      setLoading(false);
    }
  }

  async function loadStockReport() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (categoryId) sp.set("categoryId", categoryId);

      const res = await fetch(`/api/erp/listProduct/stock-report?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setStockRows(Array.isArray(data.rows) ? data.rows : []);
      setStockTotal(Number(data.total || 0));
      setStockTotals({
        purchase: money(data.totals?.purchase),
        sale: money(data.totals?.sale),
      });
    } finally {
      setLoading(false);
    }
  }

  // init
  useEffect(() => {
    loadCategories();
  }, []);

  // tab loads
  useEffect(() => {
    if (tab === "ALL") loadAllProducts();
    else loadStockReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit]);

  // debounce filters
  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === "ALL") {
        setPage(1);
        loadAllProducts();
      } else {
        loadStockReport();
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, tab]);

  // close menus outside click / ESC
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (colsOpen) {
        const el = colsMenuRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setColsOpen(false);
      }
      if (actionOpenId) {
        const t = e.target as HTMLElement;
        if (!t.closest?.("[data-action-anchor]")) setActionOpenId(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setColsOpen(false);
        setActionOpenId(null);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colsOpen, actionOpenId]);

  async function deactivateProduct(id: string) {
    if (!confirm("Deactivate this product?")) return;

    const res = await fetch(`/api/erp/listProduct/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });

    if (!res.ok) {
      alert("Failed to deactivate");
      return;
    }

    if (tab === "ALL") loadAllProducts();
    else loadStockReport();
  }

  function openOpeningStockModal(r: ProductRow) {
    setStockModalRow(r);
    setStockModalOpen(true);
  }

  const printAreaId = tab === "ALL" ? "products-print-all" : "products-print-stock";

  return (
    <div className="p-6 relative w-full">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #products-print-all,
          #products-print-all *,
          #products-print-stock,
          #products-print-stock * {
            visibility: visible !important;
          }

          #products-print-all,
          #products-print-stock {
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

          table {
            border-collapse: collapse !important;
          }

          th,
          td {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>

      <div className="w-full max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Products</div>
            <div className="text-sm text-slate-500">Manage your products</div>
          </div>

          <a className={primaryBtn} href="/erp/products/new">
            + Add
          </a>
        </div>

        <div className="mt-5 no-print flex gap-2">
          <button
            className={[
              "px-4 py-2 rounded-xl border text-sm font-medium transition",
              tab === "ALL" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            onClick={() => setTab("ALL")}
          >
            All Products
          </button>

          <button
            className={[
              "px-4 py-2 rounded-xl border text-sm font-medium transition",
              tab === "STOCK" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            onClick={() => setTab("STOCK")}
          >
            Stock Report
          </button>
        </div>

        <div className="mt-6 no-print bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Search</div>
              <input className={inputBase} placeholder="Search by name/SKU..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Category</div>
              <select className={inputBase} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {tab === "ALL" ? (
              <div>
                <div className="text-xs mb-1 text-slate-500">Show</div>
                <select className={inputBase} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-end">
                <div className="text-xs text-slate-500">Stock report shows all matching products</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2 text-sm flex-wrap text-slate-600">
            {tab === "ALL" ? (
              <>
                <a className={"ml-0 " + pillBtn} href={exportAllCsvUrl} target="_blank" rel="noreferrer">
                  Export CSV
                </a>
                <a className={pillBtn} href={exportAllExcelUrl} target="_blank" rel="noreferrer">
                  Export Excel
                </a>
              </>
            ) : (
              <>
                <a className={"ml-0 " + pillBtn} href={exportStockCsvUrl} target="_blank" rel="noreferrer">
                  Export CSV
                </a>
                <a className={pillBtn} href={exportStockExcelUrl} target="_blank" rel="noreferrer">
                  Export Excel
                </a>
              </>
            )}

            <button className={pillBtn} onClick={onExportPdf}>
              Export PDF
            </button>
            <button className={pillBtn} onClick={onPrint}>
              Print
            </button>

            {tab === "ALL" ? (
              <div className="relative" ref={colsMenuRef}>
                <button className={pillBtn} onClick={() => setColsOpen((s) => !s)}>
                  Column visibility ▾
                </button>

                {colsOpen && (
                  <div className="absolute left-0 z-50 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3">
                    {(
                      [
                        ["name", "Product Name"],
                        ["sku", "SKU"],
                        ["category", "Category"],
                        ["unit", "Unit"],
                        ["purchasePrice", "Purchase Price"],
                        ["sellingPrice", "Selling Price"],
                        ["currentStock", "Current Stock"],
                      ] as Array<[AllColKey, string]>
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm py-1.5 text-slate-700">
                        <input type="checkbox" checked={cols[k]} onChange={() => toggleCol(k)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
                        {label}
                      </label>
                    ))}
                    <div className="pt-3 flex gap-2">
                      <button
                        className={pillBtn}
                        onClick={() =>
                          setCols({
                            name: true,
                            sku: true,
                            category: true,
                            unit: true,
                            purchasePrice: true,
                            sellingPrice: true,
                            currentStock: true,
                          })
                        }
                      >
                        Reset
                      </button>
                      <button className={pillBtn} onClick={() => setColsOpen(false)}>
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="text-sm text-slate-500">{tab === "ALL" ? `Total: ${total}` : `Total: ${stockTotal}`}</div>
        </div>

        <div id={printAreaId} className="mt-6">
          <div className="hidden print:block mb-3">
            <div className="text-lg font-semibold">{tab === "ALL" ? "All Products" : "Stock Report"}</div>
            <div className="text-sm">Total records: {tab === "ALL" ? total : stockTotal}</div>
            <div className="text-xs text-gray-500">Printed: {printedAt || "-"}</div>
          </div>

          {tab === "ALL" ? (
            <AllProductsTable
              rows={rows}
              cols={cols}
              loading={loading}
              onDeactivate={deactivateProduct}
              onOpeningStock={openOpeningStockModal}
              actionOpenId={actionOpenId}
              setActionOpenId={setActionOpenId}
            />
          ) : (
            <StockReportTable rows={stockRows} loading={loading} totals={stockTotals} />
          )}
        </div>

        {tab === "ALL" ? (
          <div className="mt-4 flex items-center justify-end gap-2 text-sm no-print">
            <button
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <div className="px-2 text-sm text-slate-600">Page {page}</div>
            <button
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}

        {stockModalOpen && stockModalRow ? (
          <OpeningStockModal
            row={stockModalRow}
            onClose={() => {
              setStockModalOpen(false);
              setStockModalRow(null);
            }}
            onSaved={() => {
              setStockModalOpen(false);
              setStockModalRow(null);
              if (tab === "ALL") loadAllProducts();
              else loadStockReport();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function AllProductsTable(props: {
  rows: ProductRow[];
  cols: Record<"name" | "sku" | "category" | "unit" | "purchasePrice" | "sellingPrice" | "currentStock", boolean>;
  loading: boolean;
  onDeactivate: (id: string) => void;
  onOpeningStock: (r: ProductRow) => void;
  actionOpenId: string | null;
  setActionOpenId: (v: string | null) => void;
}) {
  const { rows, cols, loading, onDeactivate, onOpeningStock, actionOpenId, setActionOpenId } = props;
  const visibleCols = Object.entries(cols).filter(([, v]) => v).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
      <table className="min-w-full w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
            {cols.name && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product Name</th>}
            {cols.sku && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>}
            {cols.category && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>}
            {cols.unit && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit</th>}
            {cols.purchasePrice && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Purchase Price</th>}
            {cols.sellingPrice && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Selling Price</th>}
            {cols.currentStock && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Current Stock</th>}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={1 + visibleCols}>
                Loading...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((r) => {
              const unitShort = typeof r.unit?.short === "string" ? r.unit.short : "";
              const showStock = cols.currentStock && r.manageStock;
              const currentStock = money(r.currentStock ?? 0);

              const lowStock = Boolean(r.lowStock) || (r.manageStock && currentStock <= money(r.alertQty ?? 0));

              return (
                <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 no-print">
                    <div className="relative inline-block" data-action-anchor>
                      <button
                        className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
                        onClick={() => setActionOpenId(actionOpenId === r._id ? null : r._id)}
                      >
                        Actions ▾
                      </button>

                      {actionOpenId === r._id && (
                        <div className="absolute z-50 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                          <button
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-slate-700"
                            onClick={() => {
                              setActionOpenId(null);
                              onOpeningStock(r);
                            }}
                          >
                            Add / Edit Opening Stock
                          </button>

                          <button
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-rose-700"
                            onClick={() => {
                              setActionOpenId(null);
                              onDeactivate(r._id);
                            }}
                          >
                            Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {cols.name && (
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <div className="font-medium flex items-center gap-2">
                        {r.name}
                        {lowStock ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                            Low Stock
                          </span>
                        ) : null}
                      </div>
                    </td>
                  )}

                  {cols.sku && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.sku}</td>}
                  {cols.category && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.category?.name || "-"}</td>}
                  {cols.unit && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.unit?.name ? `${r.unit.name} (${unitShort})` : "-"}</td>}

                  {cols.purchasePrice && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.purchasePrice)}</td>}
                  {cols.sellingPrice && <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.sellingPrice)}</td>}

                  {cols.currentStock && (
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {showStock ? (
                        <span className="font-medium">
                          {currentStock} {unitShort}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={1 + visibleCols}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StockReportTable(props: { rows: StockRow[]; loading: boolean; totals: { purchase: number; sale: number } }) {
  const { rows, loading, totals } = props;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
      <table className="min-w-full w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Current Stock</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Purchase Price</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Selling Price</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Stock Value (purchase)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Stock Value (sale)</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>
                Loading...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((r) => (
              <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.sku}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.categoryName || "-"}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.unitName ? `${r.unitName} (${r.unitShort})` : "-"}</td>

                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  <span className="font-medium">
                    {money(r.currentStock)} {r.unitShort}
                  </span>
                </td>

                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.purchasePrice)}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.sellingPrice)}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.stockValuePurchase)}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.stockValueSale)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>
                No data available
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td className="px-4 py-3 font-semibold text-slate-700" colSpan={7}>
              Total:
            </td>
            <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.purchase)}</td>
            <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.sale)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function OpeningStockModal(props: { row: ProductRow; onClose: () => void; onSaved: () => void }) {
  const { row, onClose, onSaved } = props;

  const [openingStock, setOpeningStock] = useState<number>(Number(row.openingStock ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  async function save() {
    setSaving(true);
    setErr("");

    if (!row.manageStock) {
      setErr("This product has Manage Stock OFF. Turn it ON to set opening stock.");
      setSaving(false);
      return;
    }

    const v = Number(openingStock);
    if (!Number.isFinite(v) || v < 0) {
      setErr("Opening stock must be 0 or more.");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/erp/listProduct/${row._id}/opening-stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingStock: v }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const map: Record<string, string> = {
        NOT_FOUND: "Product not found",
        MANAGE_STOCK_OFF: "Manage stock is OFF",
        VALIDATION_FAILED: "Invalid values",
        UNAUTHORIZED: "Session expired",
        SERVER_ERROR: "Server error",
      };
      setErr(map[data?.error] || data?.error || "Failed");
      setSaving(false);
      return;
    }

    onSaved();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-900">Add / Edit Opening Stock</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}

          <div className="text-sm text-slate-700">
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-slate-500">SKU: {row.sku}</div>
          </div>

          <div>
            <div className="text-xs mb-1 text-slate-500">Opening Stock *</div>
            <input
              className={inputBase}
              type="number"
              min={0}
              value={openingStock}
              onChange={(e) => setOpeningStock(Number(e.target.value))}
              placeholder="e.g. 100"
            />
            <div className="text-xs text-slate-500 mt-1">
              ERP logic: opening stock change will auto adjust <b>currentStock</b> (delta method).
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-xl px-4 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}