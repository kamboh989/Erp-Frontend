"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormError } from "@/app/components/FormError";

type CustomerRow = any;
type ProductRow = any;
type LocationRow = { _id: string; name: string; isDefault?: boolean };
type Item = { productId: string; name: string; sku: string; qty: number; unitPrice: number };

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AddQuotation() {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);

  const [quotationDate, setQuotationDate] = useState<string>(new Date().toISOString());
  const [expiryDate, setExpiryDate] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days from now
  const [status, setStatus] = useState<"DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED">("DRAFT");
  const [referenceNo, setReferenceNo] = useState("");

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationId, setLocationId] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [shippingCharges, setShippingCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [quotationId, setQuotationId] = useState<string | null>(null);

  const customerBoxRef = useRef<HTMLDivElement | null>(null);
  const productBoxRef = useRef<HTMLDivElement | null>(null);

  const subtotal = useMemo(() => items.reduce((s, it) => s + money(it.qty) * money(it.unitPrice), 0), [items]);
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
    let rows: LocationRow[] = Array.isArray(data.rows) ? data.rows : [];

    if (!rows.length) {
      const cr = await fetch("/api/erp/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Main Warehouse", isDefault: true }),
      });
      const cd = await cr.json().catch(() => ({}));
      if (cr.ok && cd?.row) rows = [cd.row];
    }

    setLocations(rows);
    const def = rows.find((x) => x.isDefault) || rows[0];
    if (!locationId && def?._id) setLocationId(def._id);
  }

  async function loadNextRef() {
    if (isEditing) return;
    const res = await fetch("/api/erp/ref-preview?key=QUOTATION&prefix=QUO", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (data.ref) setReferenceNo(data.ref);
  }

  async function loadQuotation(id: string) {
    const res = await fetch(`/api/erp/quotations/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.row) return;

    const row = data.row;
    setQuotationDate(row.quotationDate || new Date().toISOString());
    setExpiryDate(row.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    setStatus(row.status || "DRAFT");
    setReferenceNo(row.referenceNo || "");
    setLocationId(row.locationId ? (typeof row.locationId === 'string' ? row.locationId : row.locationId._id) : "");
    setItems(row.items?.map((it: any) => ({
      productId: it.productId,
      name: it.nameSnapshot || "",
      sku: it.skuSnapshot || "",
      qty: money(it.qty),
      unitPrice: money(it.unitPrice),
    })) || []);
    setShippingCharges(money(row.shippingCharges));
    setNotes(row.notes || "");

    if (row.customerId && typeof row.customerId === 'object') {
      setCustomer(row.customerId);
      setCustomerQuery(row.customerId.businessName || row.customerId.name || "");
    } else if (row.customerId) {
      // If not populated, fetch
      const cres = await fetch(`/api/erp/customers/${row.customerId}`, { cache: "no-store" });
      const cdata = await cres.json().catch(() => ({}));
      if (cres.ok && cdata.row) {
        setCustomer(cdata.row);
        setCustomerQuery(cdata.row.businessName || cdata.row.name || "");
      }
    }
  }

  useEffect(() => {
    loadLocations();
    loadNextRef();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = searchParams?.get("id");
    if (id) {
      setIsEditing(true);
      setQuotationId(id);
      loadQuotation(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (customerOpen && customerBoxRef.current && !customerBoxRef.current.contains(t)) setCustomerOpen(false);
      if (productOpen && productBoxRef.current && !productBoxRef.current.contains(t)) setProductOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCustomerOpen(false);
        setProductOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [customerOpen, productOpen]);

  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerRows([]);
      return;
    }
    const t = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("page", "1");
        sp.set("limit", "10");
        sp.set("q", customerQuery.trim());
        const res = await fetch(`/api/erp/customers?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setCustomerRows(Array.isArray(data.rows) ? data.rows : []);
      } finally {
        setCustomerLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

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
          unitPrice: money(p.sellingPrice ?? 0),
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

  const customerAddress = useMemo(() => {
    const a = customer?.moreInfo?.billingAddress || {};
    const parts = [a.line1, a.line2, a.city, a.state, a.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }, [customer]);

  async function save() {
    setErr("");
    if (!customer?._id) return setErr("Customer required");
    if (!locationId) return setErr("Location required");
    if (!referenceNo.trim()) return setErr("Reference/Quotation no required");
    if (!items.length) return setErr("At least 1 product required");
    if (items.some((x) => money(x.qty) <= 0 || money(x.unitPrice) < 0)) return setErr("Invalid qty/price in items");

    setSaving(true);
    try {
      const payload = {
        customerId: customer._id,
        locationId,
        quotationDate,
        expiryDate,
        status,
        referenceNo: referenceNo.trim(),
        shippingCharges: money(shippingCharges),
        notes: notes.trim(),
        items: items.map((it) => ({
          productId: it.productId,
          qty: money(it.qty),
          unitPrice: money(it.unitPrice),
        })),
      };

      const res = await fetch(isEditing && quotationId ? `/api/erp/quotations/${quotationId}` : "/api/erp/quotations", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          CUSTOMER_REQUIRED: "Customer required",
          LOCATION_REQUIRED: "Location required",
          REFERENCE_REQUIRED: "Reference/Quotation no required",
          ITEMS_REQUIRED: "Please add products",
          INVALID_CUSTOMER: "Invalid customer",
          INVALID_PRODUCT: "Invalid product in items",
          INVALID_ITEMS: "Invalid items",
          REFERENCE_ALREADY_EXISTS: "This quotation reference already exists",
        };
        setErr(map[data?.error] || data?.error || "Failed to save");
        return;
      }

      alert(isEditing ? "Quotation updated successfully!" : "Quotation saved successfully!");
      if (isEditing) {
        window.location.href = "/erp/sales/quotations";
        return;
      }
      setCustomer(null);
      setCustomerQuery("");
      setCustomerRows([]);
      setCustomerOpen(false);
      setReferenceNo("");
      setStatus("DRAFT");
      setQuotationDate(new Date().toISOString());
      setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      setItems([]);
      setProductQuery("");
      setProductRows([]);
      setProductOpen(false);
      setShippingCharges(0);
      setNotes("");
      setErr("");
      loadNextRef();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx auto max-w-5xl space-y-6">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{isEditing ? "Edit Quotation" : "Add Quotation"}</div>
          <div className="text-sm text-slate-500">{isEditing ? "Update quotation details." : "Create quotations for customers with expiry dates."}</div>
        </div>

        <FormError message={err} />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2" ref={customerBoxRef}>
              <div className="text-xs mb-1 text-slate-500">Customer *</div>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    className={inputBase}
                    placeholder="Search customer name / mobile / email..."
                    value={customer ? (customer.businessName || customer.name || "") : customerQuery}
                    onChange={(e) => {
                      setCustomer(null);
                      setCustomerQuery(e.target.value);
                      setCustomerOpen(true);
                    }}
                    onFocus={() => setCustomerOpen(true)}
                  />

                  {customerOpen && (customerQuery.trim() || customerLoading) ? (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                      <div className="max-h-64 overflow-auto">
                        {customerLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                        ) : customerRows.length ? (
                          customerRows.map((r) => (
                            <button
                              key={r._id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                              onClick={() => {
                                setCustomer(r);
                                setCustomerQuery("");
                                setCustomerOpen(false);
                              }}
                            >
                              <div className="text-sm font-medium text-slate-800">{r.businessName || r.name || "Customer"}</div>
                              <div className="text-xs text-slate-500">{r.mobile || "-"} · {r.email || "-"}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">No customers found</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm shadow-sm hover:bg-indigo-700"
                  onClick={() => (window.location.href = "/erp/customers")}
                  title="Add Customer"
                >
                  + Add
                </button>
              </div>

              {customer ? (
                <div className="mt-2 text-xs text-slate-600">
                  <div><b>Address:</b> {customerAddress}</div>
                  <div><b>Mobile:</b> {customer.mobile || "-"}</div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500">Select customer to auto-fill details.</div>
              )}
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Reference / Quotation No *</div>
              <input className={inputBase} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. QUOT-2026-001" />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Quotation Date *</div>
              <input
                className={inputBase}
                type="datetime-local"
                value={new Date(quotationDate).toISOString().slice(0, 16)}
                onChange={(e) => setQuotationDate(new Date(e.target.value).toISOString())}
              />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Expiry Date *</div>
              <input
                className={inputBase}
                type="datetime-local"
                value={new Date(expiryDate).toISOString().slice(0, 16)}
                onChange={(e) => setExpiryDate(new Date(e.target.value).toISOString())}
              />
            </div>

            <div>
              <div className="text-xs mb-1 text-slate-500">Status *</div>
              <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs mb-1 text-slate-500">Location / Warehouse *</div>
              <select className={inputBase} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.isDefault ? `${l.name} (Default)` : l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Products</div>
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
                            <div className="text-xs text-slate-500">SKU: {p.sku} · Sell: Rs {money(p.sellingPrice)}</div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit Price</th>
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
                          value={it.unitPrice}
                          onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">Rs {money(it.qty) * money(it.unitPrice)}</td>
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
                {saving ? "Saving..." : isEditing ? "Update Quotation" : "Save Quotation"}
              </button>
            </div>
          </div>
          <FormError message={err} />
          <div className="mt-2 text-xs text-slate-500">
            Quotations are estimates and do not affect stock or customer dues until converted to sales.
          </div>
        </div>
      </div>
    </div>
  );
}
