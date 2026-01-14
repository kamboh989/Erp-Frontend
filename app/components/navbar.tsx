"use client";

import { Bell, Layout } from "lucide-react";
import UserMenu from "./usermenu";

export default function Navbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <nav className="shadow-md h-16 flex items-center px-4 sm:px-6 justify-between w-full bg-white">
      <button
        className="p-2 rounded hover:bg-gray-100 transition text-gray-700"
        onClick={toggleSidebar}
        type="button"
      >
        <Layout size={20} />
      </button>

      <div className="flex items-center gap-2 sm:gap-4">
        <button type="button" className="relative p-2 rounded hover:bg-gray-100 transition shrink-0">
          <Bell size={20} className="text-gray-600" />
        </button>

        {/* ✅ no props, UserMenu fetches itself */}
        <div className="shrink-0">
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}