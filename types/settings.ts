export const SETTINGS_ITEMS = {
  SETTINGS_CRM: { label: "CRM Settings", group: "CRM" },
  SETTINGS_META: { label: "Integrations — Meta Lead Ads", group: "CRM" },
  SETTINGS_ERP_LOCATIONS: { label: "ERP — Locations", group: "ERP" },
  // future:
  // SETTINGS_ERP_GENERAL: { label: "ERP General", group: "ERP" },
  // SETTINGS_ACCOUNTS: { label: "Accounts Settings", group: "ERP" },
} as const;

export type AppSetting = keyof typeof SETTINGS_ITEMS;

export const SETTINGS_GROUPS = ["CRM", "ERP", "Common"] as const;
export type SettingGroup = typeof SETTINGS_GROUPS[number];