'use client';
import { Layout } from 'lucide-react';

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  return (
    <nav className="shadow-md h-16 flex items-center px-6 justify-between w-full">
      {/* Left: Sidebar toggle (hidden on mobile since sidebar is hidden) */}
      <button
        className="p-2 rounded hover:bg-gray-200 transition text-gray-800 "
        onClick={toggleSidebar}
      >
        <Layout size={20} />
      </button>

      {/* Center / Company Logo */}
      <div className="text-xl font-bold">AIVerse</div>

      {/* Right: User / Notification */}
      <div className="flex items-center space-x-4">
        <button className="relative">
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">1</span>
          🔔
        </button>
        <div className="flex items-center space-x-2">
          <img
            src="/profile.png"
            alt="Admin"
            className="w-8 h-8 rounded-full"
          />
          <span>Admin</span>
        </div>
      </div>
    </nav>
  );
}
