"use client";

import { useEffect, useState } from "react";
import SidebarList from "./sidebarlist";

export default function Sidebar() {
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const j = await r.json();

        // ✅ RULE: Sidebar me hamesha Company Name show hoga (Owner + Staff dono)
        const companyName = j?.session?.companyName || "";
        setTitle(companyName || "Company");
      } catch {
        setTitle("Company");
      }
    })();
  }, []);

  return (
    <aside className="flex flex-col p-4 min-h-screen  border-r border-gray-200 bg-gray-50">
      <div className="mb-6 flex items-center space-x-2">
        <img src="/home/ai-verse.png" alt="Logo" className="w-10 h-10" />
        <span className="font-bold text-lg">{title || "Loading..."}</span>
      </div>

      <nav className="flex-1">
        <SidebarList />
      </nav>
    </aside>
  );
}

