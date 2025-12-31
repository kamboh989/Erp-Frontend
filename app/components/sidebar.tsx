'use client';
import SidebarList from './sidebarlist';

export default function Sidebar() {
  return (
    <aside className="flex flex-col p-4 min-h-screen border-r border-gray-200 bg-gray-50">
      {/* Logo */}
      <div className="mb-6 flex items-center space-x-2">
        <img src="/home/ai-verse.png" alt="Logo" className="w-10 h-10" />
        <span className="font-bold text-lg">Aiverse.pk</span>
      </div>

      <nav className="flex-1">
        <SidebarList />
      </nav>
    </aside>
  );
}
