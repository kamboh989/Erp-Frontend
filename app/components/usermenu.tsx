"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown, User2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = { name?: string; role?: string };

function initialsLetter(name: string) {
  const s = (name || "").trim();
  return s ? s[0].toUpperCase() : "U";
}

export default function UserMenu({ name = "User", role = "Staff" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function doLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition"
      >
        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
          {initialsLetter(name)}
        </div>

        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-gray-800">{name}</span>
          <span className="text-xs text-gray-500">{role}</span>
        </div>

        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
          >
            <User2 size={16} className="text-gray-500" />
            Profile
          </button>

          <div className="h-px bg-gray-200" />

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            type="button"
            onClick={() => {
              setOpen(false);
              doLogout();
            }}
          >
            <LogOut size={16} className="text-gray-500" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
