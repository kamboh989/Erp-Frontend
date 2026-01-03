import type { SessionUser } from "@/types/rbac";

export function requireRole(session: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN");
}

export function requirePermission(session: SessionUser, perm: string) {
  if (session.role === "SUPER_ADMIN") return;
  if (session.permissions?.includes("ANY")) return;
  if (!session.permissions?.includes(perm as any)) throw new Error("FORBIDDEN");
}
