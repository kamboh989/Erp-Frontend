"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormError } from "@/app/components/FormError";

type SupplierRow = any;
type ProductRow = any;
type LocationRow = { _id: string; name: string; isDefault?: boolean };

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AddPurchasePage() {
  // header
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);

  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString());
  const [status, setStatus] = useState<"DRAFT" | "FINAL">("DRAFT");
  const [referenceNo, setReferenceNo] = useState("");

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationId, setLocationId] = useState("");

  // items
  type Item = { productId: string; name: string; sku: string; qty: number; unitCost: number };
  const [items, setItems] = useState<Item[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  // totals + optional
  const [shippingCharges, setShippingCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);

  const supplierBoxRef = useRef<HTMLDivElement | null>(null);
  const productBoxRef = useRef<HTMLDivElement | null>(null);

  const subtotal = useMemo(() => items.reduce((s, it) => s + money(it.qty) * money(it.unitCost), 0), [items]);
  const grandTotal = useMemo(() => subtotal + money(shippingCharges), [subtotal, shippingCharges]);

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-60";

  // ✅ Professional: auto-create default location if none exists
  async function loadPurchase(id: string) {
    const res = await fetch(`/api/erp/purchases/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.row) return;
    const row = data.row;
    setPurchaseDate(row.purchaseDate || new Date().toISOString());
    setStatus(row.status || "DRAFT");
    setReferenceNo(row.referenceNo || "");
    setLocationId(row.locationId ? (typeof row.locationId === "string" ? row.locationId : row.locationId._id) : "");
    setShippingCharges(money(row.shippingCharges));
    setNotes(row.notes || "");
    setItems(row.items?.map((it: any) => ({
      productId: it.productId,
      name: it.nameSnapshot || "",
      sku: it.skuSnapshot || "",
      qty: money(it.qty),
      unitCost: money(it.unitCost),
    })) || []);
    if (row.supplierId && typeof row.supplierId === "object") {
      setSupplier(row.supplierId);
      setSupplierQuery(row.supplierId.businessName || row.supplierId.name || "");
    } else if (row.supplierId) {
      const sr = await fetch(`/api/erp/suppliers/${row.supplierId}`, { cache: "no-store" });
      const sd = await sr.json().catch(() => ({}));
      if (sr.ok && sd.contact) { setSupplier(sd.contact); setSupplierQuery(sd.contact.businessName || sd.contact.name || ""); }
    }
  }

  async function loadLocations() {
    const res = await fetch("/api/erp/locations", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    let rows: LocationRow[] = Array.isArray(data.rows) ? data.rows : [];

    if (!rows.length) {
      // auto create default
      const cr = await fetch("/api/erp/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Main Warehouse", isDefault: true }),
      });
      const cd = await cr.json().catch(() => ({}));
      if (cr.ok && cd?.row) rows = [cd.row];
    }

    setLocations(rows);

    // choose default if exists else first
    const def = rows.find((x) => x.isDefault) || rows[0];
    if (!locationId && def?._id) setLocationId(def._id);
  }

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = searchParams?.get("id");
    if (id) {
      setIsEditing(true);
      setPurchaseId(id);
      loadPurchase(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // close dropdowns
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (supplierOpen && supplierBoxRef.current && !supplierBoxRef.current.contains(t)) setSupplierOpen(false);
      if (productOpen && productBoxRef.current && !productBoxRef.current.contains(t)) setProductOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSupplierOpen(false);
        setProductOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [supplierOpen, productOpen]);

  // supplier search
  useEffect(() => {
    if (!supplierQuery.trim()) {
      setSupplierRows([]);
      return;
    }
    const t = setTimeout(async () => {
      setSupplierLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("page", "1");
        sp.set("limit", "10");
        sp.set("q", supplierQuery.trim());
        const res = await fetch(`/api/erp/suppliers?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setSupplierRows(Array.isArray(data.rows) ? data.rows : []);
      } finally {
        setSupplierLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  // product search
  useEffect(() => {
    if (!productQuery.trim()) {
      setProductRows([]);
      return;
    }
    const t = setTimeout(async () => {
      setProductLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("page", "1");
        sp.set("limit", "10");
        sp.set("q", productQuery.trim());
        const res = await fetch(`/api/erp/listProduct?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setProductRows(Array.isArray(data.rows) ? data.rows : []);
      } finally {
        setProductLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  function addItemFromProduct(p: any) {
    const id = String(p._id);

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: money(next[idx].qty) + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: id,
          name: p.name,
          sku: p.sku,
          qty: 1,
          unitCost: money(p.purchasePrice ?? 0),
        },
      ];
    });

    setProductQuery("");
    setProductRows([]);
    setProductOpen(false);
  }

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const supplierAddress = useMemo(() => {
    const a = supplier?.moreInfo?.billingAddress || {};
    const parts = [a.line1, a.line2, a.city, a.state, a.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }, [supplier]);

  async function save() {
    setErr("");

    if (!supplier?._id) return setErr("Supplier required");
    if (!locationId) return setErr("Location required");
    if (!referenceNo.trim()) return setErr("Reference/Invoice no required");
    if (!items.length) return setErr("At least 1 product required");
    if (items.some((x) => money(x.qty) <= 0 || money(x.unitCost) < 0)) return setErr("Invalid qty/cost in items");

    setSaving(true);
    try {
      const payload = {
        supplierId: supplier._id,
        locationId,
        purchaseDate,
        status,
        referenceNo: referenceNo.trim(),
        shippingCharges: money(shippingCharges),
        notes: notes.trim(),
        items: items.map((it) => ({
          productId: it.productId,
          qty: money(it.qty),
          unitCost: money(it.unitCost),
        })),
      };

      const res = await fetch(isEditing && purchaseId ? `/api/erp/purchases/${purchaseId}` : "/api/erp/purchases", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          SUPPLIER_REQUIRED: "Supplier required",
          LOCATION_REQUIRED: "Location required",
          REFERENCE_REQUIRED: "Reference/Invoice no required",
          ITEMS_REQUIRED: "Please add products",
          INVALID_SUPPLIER: "Invalid supplier",
          INVALID_PRODUCT: "Invalid product in items",
          INVALID_ITEMS: "Invalid items",
          REFERENCE_ALREADY_EXISTS: "This invoice reference already exists",
        };
        setErr(map[data?.error] || data?.error || "Failed to save");
        return;
      }

      alert(isEditing ? "Purchase updated successfully!" : "Purchase saved successfully!");
      if (isEditing) {
        window.location.href = "/erp/purchase/list";
        return;
      }
      // ✅ Reset form after success (keep location)
setSupplier(null);
setSupplierQuery("");
setSupplierRows([]);
setSupplierOpen(false);

setReferenceNo("");
setStatus("DRAFT");
setPurchaseDate(new Date().toISOString());

setItems([]);
setProductQuery("");
setProductRows([]);
setProductOpen(false);

setShippingCharges(0);
setNotes("");

setErr("");
setSaving(false); // (optional safety)

// ✅ bring user to top (fresh feel)
window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 "> 
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{isEditing ? "Edit Purchase" : "Add Purchase"}</div>
          <div className="text-sm text-slate-500">{isEditing ? "Update purchase bill details." : "Minimal purchase bill (Draft/Final)"}</div>
        </div>

        <FormError message={err} />
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Supplier */}
            <div className="md:col-span-2" ref={supplierBoxRef}>
              <div className="text-xs mb-1 text-slate-500">Supplier *</div>

              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    className={inputBase}
                    placeholder="Search supplier name / mobile / email..."
                    value={supplier ? (supplier.businessName || supplier.name || "") : supplierQuery}
                    onChange={(e) => {
                      setSupplier(null);
                      setSupplierQuery(e.target.value);
                      setSupplierOpen(true);
                    }}
                    onFocus={() => setSupplierOpen(true)}
                  />

                  {supplierOpen && (supplierQuery.trim() || supplierLoading) ? (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                      <div className="max-h-64 overflow-auto">
                        {supplierLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                        ) : supplierRows.length ? (
                          supplierRows.map((r) => (
                            <button
                              key={r._id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                              onClick={() => {
                                setSupplier(r);
                                setSupplierQuery("");
                                setSupplierOpen(false);
                              }}
                            >
                              <div className="text-sm font-medium text-slate-800">
                                {r.businessName || r.name || "Supplier"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.mobile || "-"} · {r.email || "-"}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">No suppliers found</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ✅ change this route if your suppliers page path is different */}
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm shadow-sm hover:bg-indigo-700"
                  onClick={() => (window.location.href = "/erp/suppliers")}
                  title="Add Supplier"
                >
                  + Add
                </button>
              </div>

              {supplier ? (
                <div className="mt-2 text-xs text-slate-600">
                  <div><b>Address:</b> {supplierAddress}</div>
                  <div><b>Mobile:</b> {supplier.mobile || "-"}</div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500">Select supplier to auto-fill details.</div>
              )}
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Reference / Invoice No *</div>
              <input className={inputBase} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. INV-1023" />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Purchase Date *</div>
              <input
                className={inputBase}
                type="datetime-local"
                value={new Date(purchaseDate).toISOString().slice(0, 16)}
                onChange={(e) => setPurchaseDate(new Date(e.target.value).toISOString())}
              />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Status *</div>
              <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs mb-1 text-slate-500">Location / Warehouse *</div>
              <select className={inputBase} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.isDefault ? `${l.name} (Default)` : l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Products</div>

            {/* ✅ Always visible Add Product button */}
            <div className="flex gap-2 w-full md:w-[520px]">
              <div className="relative w-full" ref={productBoxRef}>
                <input
                  className={inputBase}
                  placeholder="Search product name / SKU..."
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setProductOpen(true);
                  }}
                  onFocus={() => setProductOpen(true)}
                />

                {productOpen && (productQuery.trim() || productLoading) ? (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    <div className="max-h-64 overflow-auto">
                      {productLoading ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                      ) : productRows.length ? (
                        productRows.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                            onClick={() => addItemFromProduct(p)}
                          >
                            <div className="text-sm font-medium text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-500">SKU: {p.sku} · Purchase: Rs {money(p.purchasePrice)}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">No products found</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm shadow-sm hover:bg-indigo-700 whitespace-nowrap"
                onClick={() => (window.location.href = "/erp/products/new")}
              >
                + Add Product
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Line Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.length ? (
                  items.map((it, idx) => (
                    <tr key={it.productId} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{it.name}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{it.sku}</td>

                      <td className="px-4 py-3">
                        <input
                          className={inputBase}
                          type="number"
                          min={0}
                          value={it.qty}
                          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          className={inputBase}
                          type="number"
                          min={0}
                          value={it.unitCost}
                          onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                        />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">Rs {money(it.qty) * money(it.unitCost)}</td>

                      <td className="px-4 py-3">
                        <button
                          className="text-xs border border-rose-200 text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 hover:bg-rose-100"
                          onClick={() => removeItem(idx)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">No products added.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Shipping / Other Charges (optional)</div>
              <input
                className={inputBase}
                type="number"
                min={0}
                value={shippingCharges}
                onChange={(e) => setShippingCharges(Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <div className="text-sm text-slate-700 space-y-1 text-right">
                <div><b>Subtotal:</b> Rs {money(subtotal)}</div>
                <div><b>Grand Total:</b> Rs {money(grandTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Save */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Notes (optional)</div>
              <textarea className={inputBase} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Any notes..." />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button className={pillBtn} type="button" onClick={() => window.history.back()}>
                Cancel
              </button>
              <button className={primaryBtn} disabled={saving} onClick={save}>
                {saving ? "Saving..." : isEditing ? "Update Purchase" : status === "FINAL" ? "Save & Finalize" : "Save Draft"}
              </button>
            </div>
          </div>
          <FormError message={err} />
          <div className="mt-2 text-xs text-slate-500">
            <b>Draft:</b> no stock/supplier posting. <b>Final:</b> stock increases + supplier due increases.
          </div>
        </div>
      </div>
    </div>
  );
}