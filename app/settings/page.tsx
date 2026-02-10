"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SETTINGS_ITEMS, type AppSetting } from "@/types/settings";

const shell = "max-w-6xl mx-auto p-6";
const card =
  "rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg";
const badge =
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-black/5 text-black/70 border border-black/10";

export default function SettingsHome() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedSettings, setAllowedSettings] = useState<AppSetting[]>([]);
  const allowedSet = useMemo(() => new Set<string>(allowedSettings), [allowedSettings]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      const s = j?.session;

      setIsAdmin(Boolean(s?.isOwner) || s?.role === "ADMIN");
      setAllowedSettings((s?.allowedSettings || []) as AppSetting[]);
    })();
  }, []);

  const cards = [
    {
      key: "SETTINGS_CRM",
      href: "/settings/crm",
      title: SETTINGS_ITEMS.SETTINGS_CRM.label,
      desc: "Default lead behavior (status, meta assignment, auto move).",
      bar: "bg-gradient-to-r from-blue-600 to-indigo-400",
    },
    {
      key: "SETTINGS_META",
      href: "/settings/crm/meta",
      title: SETTINGS_ITEMS.SETTINGS_META.label,
      desc: "Connect Meta to auto-create leads.",
      bar: "bg-gradient-to-r from-black to-blue-600",
    },
  ] as const;

  const visible = cards.filter((c) => allowedSet.has(c.key));

  return (
    <div className={shell}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900">Settings</div>
          <div className="text-gray-500 text-sm">Company & CRM configuration</div>
        </div>
        <span className={badge}>{isAdmin ? "Admin Access" : "Read Only"}</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="font-semibold text-gray-900">No settings available</div>
          <div className="text-gray-500 text-sm mt-1">
            Your role doesn’t have access to any settings pages.
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((c) => (
            <Link href={c.href} className={card} key={c.key}>
              <div className="text-sm font-semibold text-gray-900">{c.title}</div>
              <div className="text-gray-500 text-sm mt-1">{c.desc}</div>
              <div className={`mt-4 h-1 rounded-full ${c.bar}`} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}