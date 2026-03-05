"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SupplierRow = any;
type ProductRow = any;
type LocationRow = { _id: string; name: string; isDefault?: boolean };
type Row = any;

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

type Mode = "LIST" | "ADD";
type Item = { productId: string; name: string; sku: string; qty: number; unitCost: number };

export default function PurchaseOrdersPage() {
  const [mode, setMode] = useState<Mode>("LIST");

  const [can, setCan] = useState<{ admin: boolean; cancel: boolean; delete: boolean }>({
    admin: false,
    cancel: false,
    delete: false,
  });

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const pillBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-60";

  const primaryBtn =
    "rounded-xl px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60";

  /* ------------------------------ locations -------------------------------- */
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  async function loadLocations() {
    const res = await fetch("/api/erp/locations", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const rows: LocationRow[] = Array.isArray(data.rows) ? data.rows : [];
    setLocations(rows);

    // set default for add form if empty
    if (!locationId && rows.length) {
      const def = rows.find((x) => x.isDefault) || rows[0];
      if (def?._id) setLocationId(def._id);
    }
  }

  /* --------------------------------- LIST --------------------------------- */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<{ subtotal: number }>({ subtotal: 0 });
  const [loading, setLoading] = useState(false);

  async function loadList() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("q", q.trim());
      if (status) sp.set("status", status);
      if (locationFilter) sp.set("locationId", locationFilter);

      const res = await fetch(`/api/erp/purchase/order?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
      setTotals({ subtotal: money(data.totals?.subtotal) });

      setCan({
        admin: Boolean(data.can?.admin),
        cancel: Boolean(data.can?.cancel),
        delete: Boolean(data.can?.delete),
      });
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------- ADD ---------------------------------- */
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);

  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString());
  const [addStatus, setAddStatus] = useState<"DRAFT" | "FINAL">("DRAFT");
  const [referenceNo, setReferenceNo] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const supplierBoxRef = useRef<HTMLDivElement | null>(null);
  const productBoxRef = useRef<HTMLDivElement | null>(null);

  const subtotal = useMemo(() => items.reduce((s, it) => s + money(it.qty) * money(it.unitCost), 0), [items]);

  useEffect(() => {
    if (mode !== "ADD") return;
    if (!supplierQuery.trim()) return setSupplierRows([]);
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
  }, [supplierQuery, mode]);

  useEffect(() => {
    if (mode !== "ADD") return;
    if (!productQuery.trim()) return setProductRows([]);
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
  }, [productQuery, mode]);

  function addItemFromProduct(p: any) {
    const id = String(p._id);
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: money(next[idx].qty) + 1 };
        return next;
      }
      return [...prev, { productId: id, name: p.name, sku: p.sku, qty: 1, unitCost: money(p.purchasePrice ?? 0) }];
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

  function resetAdd() {
    setSupplier(null);
    setSupplierQuery("");
    setSupplierRows([]);
    setReferenceNo("");
    setAddStatus("DRAFT");
    setOrderDate(new Date().toISOString());
    const def = locations.find((x) => x.isDefault) || locations[0];
    setLocationId(def?._id || "");
    setItems([]);
    setProductQuery("");
    setProductRows([]);
    setNotes("");
    setErr("");
  }

  async function saveOrder() {
    setErr("");

    if (!supplier?._id) return setErr("Supplier required");
    if (!locationId) return setErr("Location required");
    if (!referenceNo.trim()) return setErr("Reference required");
    if (!items.length) return setErr("At least 1 product required");
    if (items.some((x) => money(x.qty) <= 0 || money(x.unitCost) < 0)) return setErr("Invalid qty/cost in items");

    setSaving(true);
    try {
      const payload = {
        supplierId: supplier._id,
        locationId,
        orderDate,
        status: addStatus,
        referenceNo: referenceNo.trim(),
        notes: notes.trim(),
        items: items.map((it) => ({
          productId: it.productId,
          qty: money(it.qty),
          unitCost: money(it.unitCost),
        })),
      };

      const res = await fetch("/api/erp/purchase/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          SUPPLIER_REQUIRED: "Supplier required",
          LOCATION_REQUIRED: "Location required",
          REFERENCE_REQUIRED: "Reference required",
          ITEMS_REQUIRED: "Add products",
          INVALID_SUPPLIER: "Invalid supplier",
          INVALID_PRODUCT: "Invalid product",
          INVALID_ITEMS: "Invalid items",
          REFERENCE_ALREADY_EXISTS: "Reference already exists",
        };
        setErr(map[data?.error] || data?.error || "Failed");
        return;
      }

      alert("Purchase order saved!");
      resetAdd();
      setMode("LIST");
      setPage(1);
      await loadList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------ cancel/delete ---------------------------- */
  async function cancelOrder(id: string) {
    if (!can.cancel) return alert("Not allowed");
    if (!confirm("Cancel this FINAL purchase order?")) return;

    const res = await fetch(`/api/erp/purchase/order/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");

    await loadList();
  }

  async function deleteDraft(id: string) {
    if (!can.delete) return alert("Not allowed");
    if (!confirm("Delete this DRAFT purchase order?")) return;

    const res = await fetch(`/api/erp/purchase/order/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || "Failed");

    await loadList();
  }

  /* ------------------------------- init/load ------------------------------- */
  useEffect(() => {
    (async () => {
      await loadLocations();
      await loadList();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadList();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, locationFilter]);

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

  return (
    <div className="p-6 w-full">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Purchase Orders</div>
            <div className="text-sm text-slate-500">Orders do not change stock/due. Bill is done in Add Purchase.</div>
          </div>

          {mode === "LIST" ? (
            <button className={primaryBtn} onClick={() => setMode("ADD")}>
              + Add Order
            </button>
          ) : (
            <div className="flex gap-2">
              <button className={pillBtn} onClick={() => { resetAdd(); setMode("LIST"); }}>
                Back
              </button>
              <button className={primaryBtn} disabled={saving} onClick={saveOrder}>
                {saving ? "Saving..." : addStatus === "FINAL" ? "Save & Finalize" : "Save Draft"}
              </button>
            </div>
          )}
        </div>

        {mode === "ADD" ? (
          <>
            {err ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
            ) : null}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2" ref={supplierBoxRef}>
                  <div className="text-xs mb-1 text-slate-500">Supplier *</div>
                  <div className="relative">
                    <input
                      className={inputBase}
                      placeholder="Search supplier..."
                      value={supplier ? supplier.businessName || supplier.name || "" : supplierQuery}
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
                                <div className="text-sm font-medium text-slate-800">{r.businessName || r.name || "Supplier"}</div>
                                <div className="text-xs text-slate-500">{r.mobile || "-"} · {r.email || "-"}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500">No suppliers found</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-1 text-slate-500">Reference No *</div>
                  <input className={inputBase} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. PO-1001" />
                </div>

                <div>
                  <div className="text-xs mb-1 text-slate-500">Order Date *</div>
                  <input className={inputBase} type="datetime-local" value={new Date(orderDate).toISOString().slice(0, 16)} onChange={(e) => setOrderDate(new Date(e.target.value).toISOString())} />
                </div>

                <div>
                  <div className="text-xs mb-1 text-slate-500">Status *</div>
                  <select className={inputBase} value={addStatus} onChange={(e) => setAddStatus(e.target.value as any)}>
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs mb-1 text-slate-500">Location *</div>
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

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-800">Products</div>

                <div className="relative w-full md:w-[520px]" ref={productBoxRef}>
                  <input
                    className={inputBase}
                    placeholder="Search product..."
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
                            <input className={inputBase} type="number" min={0} value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
                          </td>
                          <td className="px-4 py-3">
                            <input className={inputBase} type="number" min={0} value={it.unitCost} onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">Rs {money(it.qty) * money(it.unitCost)}</td>
                          <td className="px-4 py-3">
                            <button className="text-xs border border-rose-200 text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 hover:bg-rose-100" onClick={() => removeItem(idx)}>
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

              <div className="mt-4 flex items-end justify-end">
                <div className="text-sm text-slate-700 space-y-1 text-right">
                  <div><b>Subtotal:</b> Rs {money(subtotal)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1 text-slate-500">Notes</div>
                  <textarea className={inputBase} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="optional" />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <button className={pillBtn} onClick={() => { resetAdd(); setMode("LIST"); }}>
                    Cancel
                  </button>
                  <button className={primaryBtn} disabled={saving} onClick={saveOrder}>
                    {saving ? "Saving..." : addStatus === "FINAL" ? "Save & Finalize" : "Save Draft"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs mb-1 text-slate-500">Search</div>
                  <input className={inputBase} placeholder="Search by ref / supplier..." value={q} onChange={(e) => setQ(e.target.value)} />
                </div>

                <div>
                  <div className="text-xs mb-1 text-slate-500">Status</div>
                  <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs mb-1 text-slate-500">Location</div>
                  <select className={inputBase} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                    <option value="">All</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide no-print">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>Loading...</td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((r) => (
                      <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 no-print">
                          <div className="flex gap-2 flex-wrap">
                            {can.cancel && r.status === "FINAL" ? (
                              <button
                                className="text-xs border border-rose-200 text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 hover:bg-rose-100"
                                onClick={() => cancelOrder(r._id)}
                              >
                                Cancel
                              </button>
                            ) : null}

                            {can.delete && r.status === "DRAFT" ? (
                              <button
                                className="text-xs border border-rose-200 text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 hover:bg-rose-100"
                                onClick={() => deleteDraft(r._id)}
                              >
                                Delete Draft
                              </button>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtPK(r.orderDate)}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.referenceNo}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.supplierNameSnapshot || "-"}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.locationName || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">Rs. {money(r.subtotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>No data available</td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700" colSpan={6}>Total:</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Rs. {money(totals.subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-2 flex items-center justify-end gap-2 text-sm no-print">
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
          </>
        )}
      </div>
    </div>
  );
}