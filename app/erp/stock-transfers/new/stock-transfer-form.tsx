"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FormError } from "@/app/components/FormError";

type LocationRow = { _id: string; name: string; isDefault?: boolean };
type ProductRow = { _id: string; name?: string; sku?: string; sellingPrice?: number };
type Item = { productId: string; name: string; sku: string; qty: number; unitPrice: number; lineTotal: number };

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function StockTransferForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString());
  const [status, setStatus] = useState("PENDING");
  const [referenceNo, setReferenceNo] = useState("");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);

  const productBoxRef = useRef<HTMLDivElement | null>(null);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + money(item.lineTotal), 0), [items]);
  const grandTotal = useMemo(() => subtotal + money(shippingCharges), [subtotal, shippingCharges]);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-60";

  async function loadLocations() {
    const res = await fetch("/api/erp/locations", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const rows: LocationRow[] = Array.isArray(data.rows) ? data.rows : [];
    setLocations(rows);
    if (!fromLocationId && rows.length) setFromLocationId(rows[0]._id);
    if (!toLocationId && rows.length) setToLocationId(rows[0]._id);
  }

  async function loadTransfer(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/stock-transfers/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.row) return;
      const row = data.row;
      setFromLocationId(row.fromLocationId?._id || row.fromLocationId || "");
      setToLocationId(row.toLocationId?._id || row.toLocationId || "");
      setTransferDate(new Date(row.transferDate || new Date()).toISOString());
      setStatus(row.status || "PENDING");
      setReferenceNo(row.referenceNo || "");
      setShippingCharges(money(row.shippingCharges));
      setNotes(row.notes || "");
      setItems(
        Array.isArray(row.items)
          ? row.items.map((it: any) => ({
              productId: it.productId,
              name: it.nameSnapshot || "",
              sku: it.skuSnapshot || "",
              qty: money(it.qty),
              unitPrice: money(it.unitPrice),
              lineTotal: money(it.lineTotal),
            }))
          : []
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
    loadNextRef();
    const id = searchParams.get("id");
    if (id) {
      setIsEditing(true);
      setTransferId(id);
      loadTransfer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadNextRef() {
    if (searchParams.get("id")) return;
    const res = await fetch("/api/erp/ref-preview?key=STOCK_TRANSFER&prefix=STR", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (data.ref) setReferenceNo(data.ref);
  }

  useEffect(() => {
    if (!productQuery.trim()) { setProductRows([]); return; }
    const timer = setTimeout(async () => {
      setProductLoading(true);
      try {
        const sp = new URLSearchParams({ page: "1", limit: "10", q: productQuery.trim() });
        const res = await fetch(`/api/erp/listProduct?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setProductRows(Array.isArray(data.rows) ? data.rows : []);
      } finally { setProductLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [productQuery]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (productOpen && productBoxRef.current && !productBoxRef.current.contains(e.target as Node))
        setProductOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setProductOpen(false); }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDocDown); document.removeEventListener("keydown", onEsc); };
  }, [productOpen]);

  function addProduct(product: ProductRow) {
    if (!product._id) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * money(item.unitPrice) }
            : item
        );
      }
      return [...prev, { productId: product._id, name: product.name || "", sku: product.sku || "", qty: 1, unitPrice: money(product.sellingPrice), lineTotal: money(product.sellingPrice) }];
    });
    setProductQuery("");
    setProductRows([]);
    setProductOpen(false);
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], ...patch };
      item.qty = money(item.qty);
      item.unitPrice = money(item.unitPrice);
      item.lineTotal = item.qty * item.unitPrice;
      next[index] = item;
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function saveTransfer() {
    setError("");
    if (!fromLocationId) return setError("From location is required.");
    if (!toLocationId) return setError("To location is required.");
    if (fromLocationId === toLocationId) return setError("From and To locations cannot be the same.");
    if (!referenceNo.trim()) return setError("Reference number is required.");
    if (!items.length) return setError("Add at least one product.");
    if (items.some((item) => item.qty <= 0 || item.unitPrice < 0)) return setError("Invalid item quantities or prices.");

    setSaving(true);
    try {
      const payload = {
        fromLocationId, toLocationId, transferDate, status,
        referenceNo: referenceNo.trim(),
        shippingCharges: money(shippingCharges),
        notes: notes.trim(),
        items: items.map((item) => ({ productId: item.productId, qty: item.qty, unitPrice: item.unitPrice })),
      };

      const url = isEditing && transferId ? `/api/erp/stock-transfers/${transferId}` : "/api/erp/stock-transfers";
      const res = await fetch(url, { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const map: Record<string, string> = {
          FROM_LOCATION_REQUIRED: "From location is required.",
          TO_LOCATION_REQUIRED: "To location is required.",
          REFERENCE_REQUIRED: "Reference number is required.",
          ITEMS_REQUIRED: "Add at least one product.",
          INVALID_STATUS: "Invalid status.",
          INVALID_ITEMS: "Invalid item quantities or prices.",
          INVALID_PRODUCT: "Invalid product selected.",
          REFERENCE_ALREADY_EXISTS: "Reference already exists.",
          CANNOT_EDIT_COMPLETED: "Completed transfers cannot be edited.",
        };
        setError(map[data?.error] || data?.error || "Failed to save stock transfer.");
        return;
      }

      alert(isEditing ? "Stock transfer updated successfully." : "Stock transfer created successfully.");
      router.push("/erp/stock-transfers");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl space-y-6">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{isEditing ? "Edit Stock Transfer" : "Add Stock Transfer"}</div>
          <div className="text-sm text-slate-500">{isEditing ? "Update the stock transfer details." : "Move inventory between locations with a stock transfer."}</div>
        </div>

        <FormError message={error} />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Reference No *</div>
              <input className={inputBase} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Enter reference" />
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Transfer Date *</div>
              <input className={inputBase} type="datetime-local" value={new Date(transferDate).toISOString().slice(0, 16)} onChange={(e) => setTransferDate(new Date(e.target.value).toISOString())} />
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Status *</div>
              <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">From Location *</div>
              <select className={inputBase} value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}>
                <option value="">Select location</option>
                {locations.map((loc) => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">To Location *</div>
              <select className={inputBase} value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                <option value="">Select location</option>
                {locations.map((loc) => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Shipping Charges</div>
              <input className={inputBase} type="number" min="0" step="0.01" value={String(shippingCharges)} onChange={(e) => setShippingCharges(Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-500">Notes</div>
              <input className={inputBase} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>

          <div className="space-y-3" ref={productBoxRef}>
            <div className="text-xs mb-1 text-slate-500">Add Product *</div>
            <div className="relative">
              <input
                className={inputBase}
                placeholder="Search product name or SKU..."
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); setProductOpen(true); }}
                onFocus={() => setProductOpen(true)}
              />
              {productOpen && (productQuery.trim() || productLoading) ? (
                <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden max-h-72">
                  <div className="max-h-72 overflow-auto">
                    {productLoading ? (
                      <div className="p-4 text-sm text-slate-500">Searching products...</div>
                    ) : productRows.length ? (
                      productRows.map((product) => (
                        <button key={product._id} type="button" className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100" onClick={() => addProduct(product)}>
                          <div className="text-sm font-medium text-slate-800">{product.name || "Product"}</div>
                          <div className="text-xs text-slate-500">{product.sku || ""}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">No products found</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Line Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr key={item.productId} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.sku}</td>
                      <td className="px-4 py-3 text-right">
                        <input className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" type="number" min="1" value={String(item.qty)} onChange={(e) => updateItem(index, { qty: Number(e.target.value) })} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" type="number" min="0" step="0.01" value={String(item.unitPrice)} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">Rs. {money(item.lineTotal)}</td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" className="text-sm text-rose-600 hover:text-rose-800" onClick={() => removeItem(index)}>Remove</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">Search and add products to this transfer.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={4}>Subtotal</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">Rs. {money(subtotal)}</td>
                  <td />
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={4}>Shipping</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">Rs. {money(shippingCharges)}</td>
                  <td />
                </tr>
                <tr className="border-t border-slate-200 bg-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900" colSpan={4}>Grand Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">Rs. {money(grandTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" className={pillBtn} onClick={() => router.push("/erp/stock-transfers")}>Cancel</button>
            <button type="button" className={primaryBtn} onClick={saveTransfer} disabled={saving || loading}>
              {saving ? "Saving..." : isEditing ? "Update Transfer" : "Create Transfer"}
            </button>
          </div>
          <FormError message={error} />
        </div>
      </div>
    </div>
  );
}
