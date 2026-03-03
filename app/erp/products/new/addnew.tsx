"use client";

import React, { useEffect, useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/*                                   UI KIT                                   */
/* -------------------------------------------------------------------------- */

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {title ? (
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Fill product details</p>
        </div>
      ) : null}
      <div className="p-6">{children}</div>
    </div>
  );
}

function Input({
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>

      <input
        {...props}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none",
          "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition",
          props.disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "",
          error ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : "",
        ].join(" ")}
      />

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function Select({
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <select
        {...props}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none",
          "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition",
          props.disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "",
          error ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : "",
        ].join(" ")}
      >
        {children}
      </select>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 transition"
    >
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint ? <div className="text-xs text-slate-500 mt-0.5">{hint}</div> : null}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={[
            "text-xs font-semibold px-2 py-1 rounded-lg border",
            checked ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-600 border-slate-200",
          ].join(" ")}
        >
          {checked ? "ON" : "OFF"}
        </span>

        <span
          className={[
            "relative inline-flex h-6 w-11 items-center rounded-full transition",
            checked ? "bg-indigo-600" : "bg-slate-300",
          ].join(" ")}
          aria-pressed={checked}
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
              checked ? "translate-x-5" : "translate-x-1",
            ].join(" ")}
          />
        </span>
      </div>
    </button>
  );
}

function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-100"
      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-100";

  return <button {...props} className={[base, styles, props.className || ""].join(" ")} />;
}

/* -------------------------------------------------------------------------- */
/*                              ADD PRODUCT FORM                              */
/* -------------------------------------------------------------------------- */

type Meta = {
  categories: Array<{ _id: string; name: string }>;
  units: Array<{ _id: string; name: string; short: string; allowDecimal?: boolean }>;
};

type Form = {
  name: string;
  sku: string;
  categoryId: string;
  unitId: string;

  manageStock: boolean;
  openingStock: number;
  alertQty: number;

  purchasePrice: number;
  sellingPrice: number;
};

function toNum(v: string) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function AddProductForm() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");

  const [v, setV] = useState<Form>({
    name: "",
    sku: "",
    categoryId: "",
    unitId: "",

    manageStock: true,
    openingStock: 0,
    alertQty: 0,

    purchasePrice: 0,
    sellingPrice: 0,
  });

  const profit = useMemo(() => {
    const p = Number(v.sellingPrice) - Number(v.purchasePrice);
    return Number.isFinite(p) ? p : 0;
  }, [v.purchasePrice, v.sellingPrice]);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setV((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setFormError("");
  }

  // ✅ metas endpoint (tumne bola metas hi rehne do)
  useEffect(() => {
    (async () => {
      try {
        setLoadingMeta(true);
        const res = await fetch("/api/metas", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        setMeta({
          categories: Array.isArray(data?.categories) ? data.categories : [],
          units: Array.isArray(data?.units) ? data.units : [],
        });
      } catch {
        setFormError("Failed to load categories/units.");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // ✅ manageStock off => stock fields 0
  useEffect(() => {
    if (!v.manageStock) {
      setV((p) => ({ ...p, openingStock: 0, alertQty: 0 }));
      setErrors((e) => ({ ...e, openingStock: "", alertQty: "" }));
    }
  }, [v.manageStock]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");

    const localErr: Record<string, string> = {};
    if (!v.name.trim()) localErr.name = "Product name required";
    if (!v.sku.trim()) localErr.sku = "SKU required";
    if (!v.categoryId) localErr.categoryId = "Select category";
    if (!v.unitId) localErr.unitId = "Select unit";
    if (!Number.isFinite(v.purchasePrice) || v.purchasePrice < 0) localErr.purchasePrice = "Invalid";
    if (!Number.isFinite(v.sellingPrice) || v.sellingPrice < 0) localErr.sellingPrice = "Invalid";
    if (v.manageStock) {
      if (!Number.isFinite(v.openingStock) || v.openingStock < 0) localErr.openingStock = "Invalid";
      if (!Number.isFinite(v.alertQty) || v.alertQty < 0) localErr.alertQty = "Invalid";
    }

    if (Object.keys(localErr).length) {
      setErrors(localErr);
      setSaving(false);
      return;
    }

    const payload = {
      name: v.name.trim(),
      sku: v.sku.trim(), // backend will uppercase
      categoryId: v.categoryId,
      unitId: v.unitId,

      manageStock: Boolean(v.manageStock),

      openingStock: v.manageStock ? Number(v.openingStock || 0) : 0,
      alertQty: v.manageStock ? Number(v.alertQty || 0) : 0,

      purchasePrice: Number(v.purchasePrice || 0),
      sellingPrice: Number(v.sellingPrice || 0),
    };

    // ✅ ERP create endpoint (single source of truth)
    const res = await fetch("/api/erp/listProduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const map: Record<string, string> = {
        SKU_ALREADY_EXISTS_IN_COMPANY: "This SKU already exists in your company.",
        INVALID_CATEGORY: "Selected category is invalid.",
        INVALID_UNIT: "Selected unit is invalid.",
        NAME_REQUIRED: "Product name is required",
        SKU_REQUIRED: "SKU is required",
        CATEGORY_REQUIRED: "Category required",
        UNIT_REQUIRED: "Unit required",
      };
      setFormError(map[data?.error] || data?.error || "Something went wrong");
      setSaving(false);
      return;
    }

    // ✅ back to products list
    window.location.href = "/erp/products/list-of-product";
  }

  const metaEmpty = !loadingMeta && ((meta?.categories?.length || 0) === 0 || (meta?.units?.length || 0) === 0);

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card title="Add Product">
        {formError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        {metaEmpty ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Categories/Units empty. Please add Categories & Units first.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Product Name"
            placeholder="e.g. Rice 5kg"
            value={v.name}
            onChange={(e) => setField("name", e.target.value)}
            error={errors.name}
          />

          <Input
            label="SKU"
            placeholder="e.g. PRD-001"
            hint="Unique per company"
            value={v.sku}
            onChange={(e) => setField("sku", e.target.value)}
            error={errors.sku}
          />

          <Select
            label="Category"
            value={v.categoryId}
            onChange={(e) => setField("categoryId", e.target.value)}
            disabled={loadingMeta}
            error={errors.categoryId}
          >
            <option value="">{loadingMeta ? "Loading..." : "Select category"}</option>
            {meta?.categories?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Unit"
            value={v.unitId}
            onChange={(e) => setField("unitId", e.target.value)}
            disabled={loadingMeta}
            error={errors.unitId}
          >
            <option value="">{loadingMeta ? "Loading..." : "Select unit"}</option>
            {meta?.units?.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.short})
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-5">
          <Toggle
            label="Manage Stock"
            checked={v.manageStock}
            onChange={(x) => setField("manageStock", x)}
            hint="ON: opening stock + low stock alert will work. OFF: stock tracking disabled (for services)."
          />
        </div>

        {!v.manageStock ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Stock tracking is <b>OFF</b>. Opening Stock & Alert Quantity disabled.
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Opening Stock"
            type="number"
            min={0}
            value={String(v.openingStock)}
            onChange={(e) => setField("openingStock", toNum(e.target.value))}
            disabled={!v.manageStock}
            error={errors.openingStock}
          />

          <Input
            label="Alert Quantity"
            type="number"
            min={0}
            value={String(v.alertQty)}
            onChange={(e) => setField("alertQty", toNum(e.target.value))}
            disabled={!v.manageStock}
            hint="Low stock warning"
            error={errors.alertQty}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Purchase Price"
            type="number"
            min={0}
            value={String(v.purchasePrice)}
            onChange={(e) => setField("purchasePrice", toNum(e.target.value))}
            error={errors.purchasePrice}
          />

          <Input
            label="Selling Price"
            type="number"
            min={0}
            value={String(v.sellingPrice)}
            onChange={(e) => setField("sellingPrice", toNum(e.target.value))}
            hint={`Profit: ${profit}`}
            error={errors.sellingPrice}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/erp/products")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || loadingMeta}>
            {saving ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default function AddProductPage() {
  return (
    <div className="mx-auto max-w-6xl p-5 md:p-8">
      <AddProductForm />
    </div>
  );
}