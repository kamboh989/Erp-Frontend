// export type UserRole =
//   | "SUPER_ADMIN"
//   | "COMPANY_ADMIN"
//   | "MANAGER"
//   | "CASHIER"
//   | "STAFF";

// export const ROLE_LABELS: Record<UserRole, string> = {
//   SUPER_ADMIN: "Super Admin",
//   COMPANY_ADMIN: "Company Admin",
//   MANAGER: "Manager",
//   CASHIER: "Cashier",
//   STAFF: "Staff",
// };

// export type Permission =
//   | "USER_MANAGE"
//   | "COMPANY_MANAGE"
//   | "ANY"; // SUPER POWER (sirf super admin ko)

// export type SessionUser = {
//   id: string;
//   role: UserRole;
//   companyId?: string | null;
//   permissions?: Permission[];
//   allowedModules?: string[];
// };
