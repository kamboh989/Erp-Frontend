'use client';
import { useState, useEffect } from 'react';
import Navbar from './navbar';
import Sidebar from './sidebar';
import { usePathname } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

export default function NavbarWithSidebar({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const hideNavbar = pathname === '/';
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // ✅ Detect screen size and set default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);   // Desktop default open
      } else {
        setSidebarOpen(false);  // Mobile default closed
      }
    };

    handleResize(); // run once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      {!hideNavbar && (
        <div
          className={`transition-all duration-300 ease-in-out 
            ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'} 
            overflow-hidden hidden md:block`}
        >
          <Sidebar />
        </div>
      )}

      {/* Mobile Sidebar (Drawer) */}
      {!hideNavbar && (
        <div
          className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ease-in-out 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Overlay */}
          <div
            className={`fixed inset-0  bg-opacity-50 transition-opacity duration-300 ease-in-out 
              ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={toggleSidebar}
          ></div>

          {/* Drawer */}
          <div className="relative w-64 bg-gray-50 p-4 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!hideNavbar && <Navbar toggleSidebar={toggleSidebar} />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
