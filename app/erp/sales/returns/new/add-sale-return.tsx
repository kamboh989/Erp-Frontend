"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormError } from "@/app/components/FormError";

type CustomerRow = any;
type ProductRow  = any;
type LocationRow = { _id: string; name: string; isDefault?: boolean };
type Item        = { productId: string; name: string; sku: string; qty: number; unitPrice: number };

// ✅ Safe number conversion — always returns a finite number
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AddSaleReturn() {
  // ── customer ──
  const [customerQuery,   setCustomerQuery]   = useState("");
  const [customerOpen,    setCustomerOpen]    = useState(false);
  const [customerRows,    setCustomerRows]    = useState<CustomerRow[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customer,        setCustomer]        = useState<CustomerRow | null>(null);

  // ── header fields ──
  const [returnDate,  setReturnDate]  = useState<string>(new Date().toISOString());
  const [status,      setStatus]      = useState<"DRAFT" | "FINAL">("DRAFT");
  const [referenceNo, setReferenceNo] = useState("");

  // ── location ──
  const [locations,  setLocations]  = useState<LocationRow[]>([]);
  const [locationId, setLocationId] = useState("");

  // ── items ──
  const [items,          setItems]          = useState<Item[]>([]);
  const [productQuery,   setProductQuery]   = useState("");
  const [productOpen,    setProductOpen]    = useState(false);
  const [productRows,    setProductRows]    = useState<ProductRow[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  // ── charges / payment ──
  // ✅ Keep as number always — never store as string
  const [shippingCharges,  setShippingCharges]  = useState<number>(0);
  const [paymentAmount,    setPaymentAmount]    = useState<number>(0);
  const [paymentMethod,    setPaymentMethod]    = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote,      setPaymentNote]      = useState("");
  const [notes,            setNotes]            = useState("");

  // ── UI state ──
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");
  const [isEditing,  setIsEditing]  = useState(false);
  const [returnId,   setReturnId]   = useState<string | null>(null);

  const searchParams   = useSearchParams();
  const customerBoxRef = useRef<HTMLDivElement | null>(null);
  const productBoxRef  = useRef<HTMLDivElement | null>(null);

  // ─────────────────────────────────────────────
  // ✅ FIXED CALCULATIONS
  // All three derived from same source of truth
  // ─────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + toNum(it.qty) * toNum(it.unitPrice), 0),
    [items]
  );

  const actualPaid = useMemo(() => toNum(paymentAmount), [paymentAmount]);

  // grandTotal = items subtotal + shipping only (payment is NOT added)
  const grandTotal = useMemo(
    () => subtotal + toNum(shippingCharges),
    [subtotal, shippingCharges]
  );

  // due = max(0, grandTotal - paid)
  const actualDue = useMemo(
    () => Math.max(0, grandTotal - toNum(paymentAmount)),
    [grandTotal, paymentAmount]
  );

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-60";

  // ─────────────────────────────────────────────
  // Load locations
  // ─────────────────────────────────────────────
  async function loadLocations() {
    const res  = await fetch("/api/erp/locations", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    let rows: LocationRow[] = Array.isArray(data.rows) ? data.rows : [];

    if (!rows.length) {
      const cr = await fetch("/api/erp/locations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: "Main Warehouse", isDefault: true }),
      });
      const cd = await cr.json().catch(() => ({}));
      if (cr.ok && cd?.row) rows = [cd.row];
    }

    setLocations(rows);
    const def = rows.find((x) => x.isDefault) || rows[0];
    if (!locationId && def?._id) setLocationId(def._id);
  }

  // ─────────────────────────────────────────────
  // Load existing return for edit
  // ─────────────────────────────────────────────
  async function loadReturn(id: string) {
    const res  = await fetch(`/api/erp/sale-returns/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.row) return;

    const row = data.row;
    setReturnDate(row.returnDate  || new Date().toISOString());
    setStatus(row.status          || "DRAFT");
    setReferenceNo(row.referenceNo || "");
    setLocationId(
      row.locationId
        ? typeof row.locationId === "string"
          ? row.locationId
          : row.locationId._id
        : ""
    );
    setItems(
      (row.items || []).map((it: any) => ({
        productId: String(it.productId || ""),
        name:      it.nameSnapshot || "",
        sku:       it.skuSnapshot  || "",
        qty:       toNum(it.qty),
        unitPrice: toNum(it.unitPrice),
      }))
    );
    // ✅ toNum ensures these are always numbers
    setShippingCharges(toNum(row.shippingCharges));
    setPaymentAmount(toNum(row.paidAmount));
    setPaymentMethod(row.paymentMethod    || "");
    setPaymentReference(row.paymentReference || "");
    setPaymentNote(row.paymentNote        || "");
    setNotes(row.notes                    || "");

    if (row.customerId && typeof row.customerId === "object") {
      setCustomer(row.customerId);
      setCustomerQuery(row.customerId.businessName || row.customerId.name || "");
    } else if (row.customerId) {
      const cres  = await fetch(`/api/erp/customers/${row.customerId}`, { cache: "no-store" });
      const cdata = await cres.json().catch(() => ({}));
      if (cres.ok && cdata.row) {
        setCustomer(cdata.row);
        setCustomerQuery(cdata.row.businessName || cdata.row.name || "");
      }
    }
  }

  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────
  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = searchParams?.get("id");
    if (id) {
      setIsEditing(true);
      setReturnId(id);
      loadReturn(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // outside click / ESC closes dropdowns
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (customerOpen && customerBoxRef.current && !customerBoxRef.current.contains(t))
        setCustomerOpen(false);
      if (productOpen && productBoxRef.current && !productBoxRef.current.contains(t))
        setProductOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setCustomerOpen(false); setProductOpen(false); }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown",   onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown",   onEsc);
    };
  }, [customerOpen, productOpen]);

  // customer search
  useEffect(() => {
    if (!customerQuery.trim()) { setCustomerRows([]); return; }
    const t = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const sp = new URLSearchParams({ page: "1", limit: "10", q: customerQuery.trim() });
        const res  = await fetch(`/api/erp/customers?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setCustomerRows(Array.isArray(data.rows) ? data.rows : []);
      } finally { setCustomerLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // product search
  useEffect(() => {
    if (!productQuery.trim()) { setProductRows([]); return; }
    const t = setTimeout(async () => {
      setProductLoading(true);
      try {
        const sp = new URLSearchParams({ page: "1", limit: "10", q: productQuery.trim() });
        const res  = await fetch(`/api/erp/listProduct?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setProductRows(Array.isArray(data.rows) ? data.rows : []);
      } finally { setProductLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  // ─────────────────────────────────────────────
  // Item helpers
  // ─────────────────────────────────────────────
  function addItemFromProduct(p: any) {
    const id = String(p._id);
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx]  = { ...next[idx], qty: toNum(next[idx].qty) + 1 };
        return next;
      }
      return [
        ...prev,
        { productId: id, name: p.name, sku: p.sku, qty: 1, unitPrice: toNum(p.sellingPrice ?? 0) },
      ];
    });
    setProductQuery("");
    setProductRows([]);
    setProductOpen(false);
  }

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => {
      const next = [...prev];
      next[i]    = { ...next[i], ...patch };
      return next;
    });
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const customerAddress = useMemo(() => {
    const a     = customer?.moreInfo?.billingAddress || {};
    const parts = [a.line1, a.line2, a.city, a.state, a.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }, [customer]);

  // ─────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────
  async function save() {
    setErr("");
    if (!customer?._id)          return setErr("Customer required");
    if (!locationId)             return setErr("Location required");
    if (!referenceNo.trim())     return setErr("Reference / Return no required");
    if (!items.length)           return setErr("At least 1 product required");
    if (items.some((x) => toNum(x.qty) <= 0 || toNum(x.unitPrice) < 0))
      return setErr("Invalid qty / price in items");

    setSaving(true);
    try {
      const payload = {
        customerId:       customer._id,
        locationId,
        returnDate,
        status,
        referenceNo:      referenceNo.trim(),
        shippingCharges:  toNum(shippingCharges),
        // ✅ send actualPaid so server calculates correctly
        paymentAmount:    actualPaid,
        paymentMethod:    paymentMethod.trim(),
        paymentReference: paymentReference.trim(),
        paymentNote:      paymentNote.trim(),
        notes:            notes.trim(),
        items: items.map((it) => ({
          productId: it.productId,
          qty:       toNum(it.qty),
          unitPrice: toNum(it.unitPrice),
        })),
      };

      const url = isEditing && returnId
        ? `/api/erp/sale-returns/${returnId}`
        : "/api/erp/sale-returns";

      const res  = await fetch(url, {
        method:  isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const map: Record<string, string> = {
          CUSTOMER_REQUIRED:       "Customer required",
          LOCATION_REQUIRED:       "Location required",
          REFERENCE_REQUIRED:      "Reference / Return no required",
          ITEMS_REQUIRED:          "Please add products",
          INVALID_CUSTOMER:        "Invalid customer",
          INVALID_PRODUCT:         "Invalid product in items",
          INVALID_ITEMS:           "Invalid items",
          PAYMENT_METHOD_REQUIRED: "Payment method required when amount > 0",
          REFERENCE_ALREADY_EXISTS:"This return reference already exists",
          CANNOT_EDIT_FINAL:       "Cannot edit a finalized return",
          CANNOT_EDIT_CANCELLED:   "Cannot edit a cancelled return",
        };
        setErr(map[data?.error] || data?.error || "Failed to save");
        return;
      }

      alert(isEditing ? "Sale return updated!" : "Sale return saved!");

      if (isEditing) {
        window.location.href = "/erp/sales/returns";
        return;
      }

      // ── reset form ──
      setCustomer(null);
      setCustomerQuery("");
      setCustomerRows([]);
      setCustomerOpen(false);
      setReferenceNo("");
      setStatus("DRAFT");
      setReturnDate(new Date().toISOString());
      setItems([]);
      setProductQuery("");
      setProductRows([]);
      setProductOpen(false);
      setShippingCharges(0);
      setPaymentAmount(0);
      setPaymentMethod("");
      setPaymentReference("");
      setPaymentNote("");
      setNotes("");
      setErr("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-6 w-full">
      <div className="w-full max-w-5xl space-y-6">

        {/* Header */}
        <div>
          <div className="text-2xl font-semibold text-slate-900">
            {isEditing ? "Edit Sale Return" : "Add Sale Return"}
          </div>
          <div className="text-sm text-slate-500">
            {isEditing
              ? "Update sale return details."
              : "Process customer returns and manage refunds."}
          </div>
        </div>

        <FormError message={err} />

        {/* ── Section 1: Header Info ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            {/* Customer */}
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
                  {customerOpen && (customerQuery.trim() || customerLoading) && (
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
                              onClick={() => { setCustomer(r); setCustomerQuery(""); setCustomerOpen(false); }}
                            >
                              <div className="text-sm font-medium text-slate-800">
                                {r.businessName || r.name || "Customer"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.mobile || "-"} · {r.email || "-"}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">No customers found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm shadow-sm hover:bg-indigo-700"
                  onClick={() => (window.location.href = "/erp/customers")}
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

            {/* Reference */}
            <div>
              <div className="text-xs mb-1 text-slate-500">Reference / Return No *</div>
              <input
                className={inputBase}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. RET-2026-001"
              />
            </div>

            {/* Return Date */}
            <div>
              <div className="text-xs mb-1 text-slate-500">Return Date *</div>
              <input
                className={inputBase}
                type="datetime-local"
                value={new Date(returnDate).toISOString().slice(0, 16)}
                onChange={(e) => setReturnDate(new Date(e.target.value).toISOString())}
              />
            </div>

            {/* Status */}
            <div>
              <div className="text-xs mb-1 text-slate-500">Status *</div>
              <select
                className={inputBase}
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
              </select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <div className="text-xs mb-1 text-slate-500">Location / Warehouse *</div>
              <select
                className={inputBase}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
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

        {/* ── Section 2: Products ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-800">Products</div>
            <div className="flex gap-2 w-full md:w-[520px]">
              <div className="relative w-full" ref={productBoxRef}>
                <input
                  className={inputBase}
                  placeholder="Search product name / SKU..."
                  value={productQuery}
                  onChange={(e) => { setProductQuery(e.target.value); setProductOpen(true); }}
                  onFocus={() => setProductOpen(true)}
                />
                {productOpen && (productQuery.trim() || productLoading) && (
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
                            <div className="text-xs text-slate-500">
                              SKU: {p.sku} · Sell: Rs. {toNum(p.sellingPrice).toLocaleString("en-PK")}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">No products found</div>
                      )}
                    </div>
                  </div>
                )}
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

          {/* Items table */}
          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-32">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-36">Unit Price</th>
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
                          step={1}
                          // ✅ value is always a number, not string
                          value={it.qty === 0 ? "" : it.qty}
                          onChange={(e) =>
                            updateItem(idx, { qty: toNum(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={inputBase}
                          type="number"
                          min={0}
                          step={0.01}
                          value={it.unitPrice === 0 ? "" : it.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, { unitPrice: toNum(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        Rs. {(toNum(it.qty) * toNum(it.unitPrice)).toLocaleString("en-PK")}
                      </td>
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
                    <td colSpan={6} className="px-4 py-8 text-sm text-slate-400 text-center">
                      No products added. Search above to add products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Payment section ── */}
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="text-sm font-semibold text-slate-800 mb-4">Refund / Payment Details</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs mb-1 text-slate-500">Refund Amount</div>
                <input
                  className={inputBase}
                  type="number"
                  min={0}
                  step={0.01}
                  // ✅ placeholder shows grandTotal hint
                  placeholder="Enter refund amount"
                  value={paymentAmount === 0 ? "" : paymentAmount}
                  onChange={(e) => {
                    // ✅ Always store as number
                    const v = toNum(e.target.value);
                    setPaymentAmount(v < 0 ? 0 : v);
                  }}
                />
              </div>

              <div>
                <div className="text-xs mb-1 text-slate-500">Refund Method</div>
                <select
                  className={inputBase}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Select method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <div className="text-xs mb-1 text-slate-500">Refund Reference</div>
                <input
                  className={inputBase}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Txn ID, cheque no..."
                />
              </div>

              <div className="md:col-span-3">
                <div className="text-xs mb-1 text-slate-500">Refund Note</div>
                <input
                  className={inputBase}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Optional refund memo..."
                />
              </div>
            </div>

            {/* ✅ FIXED Summary box */}
            <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-1.5 text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-medium">Rs. {subtotal.toLocaleString("en-PK")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping / Other:</span>
                <span className="font-medium">Rs. {toNum(shippingCharges).toLocaleString("en-PK")}</span>
              </div>
              <div className="border-t border-slate-100 pt-1.5 flex justify-between text-base">
                <span className="font-semibold text-slate-800">Grand Total:</span>
                <span className="font-semibold text-slate-800">Rs. {grandTotal.toLocaleString("en-PK")}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Refunded:</span>
                {/* ✅ shows actualPaid */}
                <span className="font-medium">Rs. {actualPaid.toLocaleString("en-PK")}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Pending Refund (Due):</span>
                {/* ✅ shows actualDue */}
                <span className="font-medium">Rs. {actualDue.toLocaleString("en-PK")}</span>
              </div>
              {status === "DRAFT" && paymentAmount > 0 && (
                <div className="text-xs text-slate-400 text-right pt-1">
                  Refunds will be processed when this return is finalized.
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Shipping / Other Charges (optional)</div>
              <input
                className={inputBase}
                type="number"
                min={0}
                step={0.01}
                value={shippingCharges === 0 ? "" : shippingCharges}
                onChange={(e) => setShippingCharges(Math.max(0, toNum(e.target.value)))}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Notes + Submit ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-500">Notes (optional)</div>
              <textarea
                className={inputBase}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Any notes about this return..."
              />
            </div>
            <div className="flex flex-col justify-end items-end gap-3">
              {/* Summary repeat for quick view */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total:</span>
                  <span className="font-semibold">Rs. {grandTotal.toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Refunded:</span>
                  <span className="font-semibold">Rs. {actualPaid.toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Due:</span>
                  <span className="font-semibold">Rs. {actualDue.toLocaleString("en-PK")}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={pillBtn} type="button" onClick={() => window.history.back()}>
                  Cancel
                </button>
                <button className={primaryBtn} disabled={saving} onClick={save}>
                  {saving
                    ? "Saving..."
                    : isEditing
                    ? "Update Return"
                    : status === "FINAL"
                    ? "Save & Finalize"
                    : "Save Draft"}
                </button>
              </div>
            </div>
          </div>
          <FormError message={err} />
          <div className="mt-3 text-xs text-slate-400">
            <b>Draft:</b> no stock or refund posting. &nbsp;
            <b>Final:</b> stock increases and customer refund due updates.
          </div>
        </div>

      </div>
    </div>
  );
}