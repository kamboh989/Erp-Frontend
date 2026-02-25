export function isCompanyAdmin(session: any) {
  return Boolean(session?.isOwner) || session?.role === "ADMIN";
}

export function canDeleteContact(session: any) {
  return isCompanyAdmin(session); // staff never
}

export function listScopeFilter(session: any) {
  // owner/admin see all
  if (isCompanyAdmin(session)) return {};
  // staff only assigned
  return { assignedTo: session.userId };
}