import React from "react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Super Admin</h2>
      <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <a href="/super-admin">Dashboard</a>
        <a href="/super-admin/companies">Companies</a>
        <a href="/super-admin/users">Users</a>
      </nav>
      <div>{children}</div>
    </div>
  );
}
