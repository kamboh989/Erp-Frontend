// types/modules.ts

export const MODULES = {
  // Core
  DASHBOARD: { label: "Dashboard", group: "Core" },

  // CRM
  CRM_LEADS: { label: "Leads", group: "CRM" },
  CRM_FOLLOWUPS: { label: "Follow up", group: "CRM" },
  CRM_DEALS: { label: "Deals", group: "CRM" },

  // ERP buckets (old keys keep to not break)
  ERP_SALES: {
    label: "Sales",
    group: "ERP",
    implies: ["ERP_CUSTOMERS", "ERP_QUOTATIONS", "ERP_INVOICES"],
  },
  ERP_INVENTORY: {
    label: "Inventory",
    group: "ERP",
    implies: ["ERP_ITEMS_SERVICES"],
  },
  ERP_PURCHASING: {
    label: "Purchasing",
    group: "ERP",
    implies: ["ERP_VENDORS", "ERP_PURCHASE_ORDERS"],
  },
  ERP_ACCOUNTS: {
    label: "Accounts",
    group: "ERP",
    implies: ["ERP_EXPENSES", "ERP_PAYMENTS", "ERP_LEDGER"],
  },

  // ERP → Sales
  ERP_CUSTOMERS: { label: "Customers", group: "ERP" },
  ERP_QUOTATIONS: { label: "Quotations", group: "ERP" },
  ERP_INVOICES: { label: "Invoices", group: "ERP" },

  // ERP → Purchasing
  ERP_VENDORS: { label: "Vendors", group: "ERP" },
  ERP_PURCHASE_ORDERS: { label: "Purchase Orders", group: "ERP" },

  // ERP → Inventory
  ERP_ITEMS_SERVICES: { label: "Items / Services", group: "ERP" },

  // ERP → Accounts
  ERP_EXPENSES: { label: "Expenses", group: "ERP" },
  ERP_PAYMENTS: { label: "Payments", group: "ERP" },
  ERP_LEDGER: { label: "Ledger", group: "ERP" },

  // Common
  REPORTS: { label: "Reports", group: "Common" },
  SETTINGS: { label: "Settings", group: "Common" },
} as const;

export type AppModule = keyof typeof MODULES;

export const MODULE_GROUPS = ["Core", "CRM", "ERP", "Common"] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number];

// ✅ Professional ERP sections (typed keys)
export const ERP_SECTIONS: ReadonlyArray<{
  key: AppModule;
  title: string;
}> = [
  { key: "ERP_SALES", title: "Sales" },
  { key: "ERP_INVENTORY", title: "Inventory" },
  { key: "ERP_PURCHASING", title: "Purchasing" },
  { key: "ERP_ACCOUNTS", title: "Accounts" },
] as const;

// internal helpers
type ModuleDef = (typeof MODULES)[AppModule];
type ImpliesList = readonly AppModule[];

// ✅ expand parent → implied children recursively
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

// ✅ access check: direct OR implied by any selected parent
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

// ✅ get direct children of a parent (no recursion)
export function getChildren(parent: AppModule): AppModule[] {
  const def = MODULES[parent] as ModuleDef;
  const implied = (def as any).implies as ImpliesList | undefined;
  return implied ? Array.from(implied) : [];
}