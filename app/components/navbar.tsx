"use client";

import { Bell, Layout } from "lucide-react";
import { useEffect, useState } from "react";
import UserMenu from "./usermenu";

export default function Navbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      setMe(j?.session || null);
    })();
  }, []);

  const name = me?.name || "User";
  const role = me?.isOwner ? "Owner" : (me?.role === "ADMIN" ? "Admin" : "Staff");

  return (
    <nav className="shadow-md h-16 flex items-center px-6 justify-between w-full bg-white">
      <button
        className="p-2 rounded hover:bg-gray-100 transition text-gray-700"
        onClick={toggleSidebar}
        type="button"
      >
        <Layout size={20} />
      </button>

      <div />

      <div className="flex items-center gap-4">
        <button type="button" className="relative p-2 rounded hover:bg-gray-100 transition">
          <Bell size={20} className="text-gray-600" />
        </button>

        <UserMenu name={name} role={role} />
      </div>
    </nav>
  );
}
