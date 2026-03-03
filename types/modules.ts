// types/modules.ts

export const MODULES = {
  // Core
  DASHBOARD: { label: "Dashboard", group: "Core" },

  // CRM
  CRM_LEADS: { label: "Leads", group: "CRM" },
  CRM_FOLLOWUPS: { label: "Follow up", group: "CRM" },
  CRM_DEALS: { label: "Deals", group: "CRM" },

  // ======================
  // ERP (NEW STRUCTURE)
  // ======================

  ERP_CONTACTS: {
    label: "Contacts",
    group: "ERP",
    implies: ["ERP_SUPPLIERS", "ERP_CUSTOMERS"],
  },

  ERP_PRODUCTS: {
    label: "Products",
    group: "ERP",
    implies: ["ERP_PRODUCTS_LIST", "ERP_PRODUCTS_ADD", "ERP_UNITS", "ERP_CATEGORIES"],
  },

  ERP_PURCHASE: {
    label: "Purchase",
    group: "ERP",
    implies: ["ERP_PURCHASE_ORDER", "ERP_PURCHASE_LIST", "ERP_PURCHASE_ADD"],
  },

  // ERP → Contacts
  ERP_SUPPLIERS: { label: "Suppliers", group: "ERP" },
  ERP_CUSTOMERS: { label: "Customers", group: "ERP" },

  // ERP → Products
  ERP_PRODUCTS_LIST: { label: "List of Products", group: "ERP" },
  ERP_PRODUCTS_ADD: { label: "Add New Product", group: "ERP" },
  ERP_UNITS: { label: "Units", group: "ERP" },

  // ✅ NEW: ERP → Products → Categories
  ERP_CATEGORIES: { label: "Categories", group: "ERP" },

  // ERP → Purchase
  ERP_PURCHASE_ORDER: { label: "Purchase Order", group: "ERP" },
  ERP_PURCHASE_LIST: { label: "List Purchase", group: "ERP" },
  ERP_PURCHASE_ADD: { label: "Add Purchase", group: "ERP" },

  // Common
  REPORTS: { label: "Reports", group: "Common" },
  SETTINGS: { label: "Settings", group: "Common" },
} as const;

export type AppModule = keyof typeof MODULES;

export const MODULE_GROUPS = ["Core", "CRM", "ERP", "Common"] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number];

// ERP Sections (Parent Bundles)
export const ERP_SECTIONS: ReadonlyArray<{
  key: AppModule;
  title: string;
}> = [
  { key: "ERP_CONTACTS", title: "Contacts" },
  { key: "ERP_PRODUCTS", title: "Products" },
  { key: "ERP_PURCHASE", title: "Purchase" },
] as const;

// ======================
// Helpers
// ======================

type ModuleDef = (typeof MODULES)[AppModule];
type ImpliesList = readonly AppModule[];

// Expand parent recursively
export function expandModules(input: AppModule[]) {
  const out = new Set<AppModule>();

  const add = (m: AppModule) => {
    if (out.has(m)) return;
    out.add(m);

    const def = MODULES[m] as ModuleDef;
    const implied = (def as any).implies as ImpliesList | undefined;
    implied?.forEach(add);
  };

  input.forEach(add);
  return Array.from(out);
}

// Access check
export function hasAccess(allowed: Set<string>, target: AppModule) {
  if (allowed.has(target)) return true;

  for (const key of Object.keys(MODULES) as AppModule[]) {
    if (!allowed.has(key)) continue;

    const def = MODULES[key] as ModuleDef;
    const implied = (def as any).implies as ImpliesList | undefined;

    if (implied?.includes(target)) return true;
  }

  return false;
}

// Get direct children
export function getChildren(parent: AppModule): AppModule[] {
  const def = MODULES[parent] as ModuleDef;
  const implied = (def as any).implies as ImpliesList | undefined;
  return implied ? Array.from(implied) : [];
}