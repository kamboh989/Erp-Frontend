export const MODULES = {
  DASHBOARD: { label: "Dashboard", group: "Core" },

  CRM_LEADS: { label: "Leads", group: "CRM" },
  CRM_CUSTOMERS: { label: "Customers", group: "CRM" },
  CRM_DEALS: { label: "Deals", group: "CRM" },

  ERP_SALES: { label: "Sales", group: "ERP" },
  ERP_INVENTORY: { label: "Inventory", group: "ERP" },
  ERP_PURCHASING: { label: "Purchasing", group: "ERP" },
  ERP_ACCOUNTS: { label: "Accounts", group: "ERP" },

  REPORTS: { label: "Reports", group: "Common" },
  SETTINGS: { label: "Settings", group: "Common" },
} as const;

export type AppModule = keyof typeof MODULES;

export const MODULE_GROUPS = ["Core", "CRM", "ERP", "Common"] as const;
export type ModuleGroup = typeof MODULE_GROUPS[number];
