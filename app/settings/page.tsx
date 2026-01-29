"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const shell = "max-w-6xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg";
const badge =
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-black/5 text-black/70 border border-black/10";

export default function SettingsHome() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      const s = j?.session;
      setIsAdmin(Boolean(s?.isOwner) || s?.role === "ADMIN");
    })();
  }, []);

  return (
    <div className={shell}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">Settings</div>
          <div className="text-gray-500 text-sm">Company & CRM configuration</div>
        </div>
        <span className={badge}>{isAdmin ? "Admin Access" : "Read Only"}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/settings/crm" className={card}>
          <div className="text-sm font-semibold text-gray-900">CRM Settings</div>
          <div className="text-gray-500 text-sm mt-1">
            Default lead behavior (status, meta assignment, auto move).
          </div>
          <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-400" />
        </Link>

        <Link href="/settings/integrations/meta" className={card}>
          <div className="text-sm font-semibold text-gray-900">Integrations — Meta Lead Ads</div>
          <div className="text-gray-500 text-sm mt-1">
            Connect Meta to auto-create leads.
          </div>
          <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-black to-blue-600" />
        </Link>
      </div>
    </div>
  );
}
