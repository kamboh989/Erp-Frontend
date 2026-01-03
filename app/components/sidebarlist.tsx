'use client';
import Link from 'next/link';
import {
  ChevronDown,
  LayoutDashboard,
  Users,
  UserPlus,
  UserCheck,
  Handshake,
  Building2,
  ShoppingCart,
  Boxes,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type ModuleKey =
  | 'DASHBOARD'
  | 'CRM_LEADS' | 'CRM_CUSTOMERS' | 'CRM_DEALS'
  | 'ERP_SALES' | 'ERP_INVENTORY' | 'ERP_PURCHASING' | 'ERP_ACCOUNTS'
  | 'REPORTS'
  | 'SETTINGS';

type MenuItem = {
  label: string;
  href?: string;
  icon?: any;
  module?: ModuleKey;          // ✅ new
  children?: MenuItem[];
};

const MENU: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'DASHBOARD' },

  {
    label: 'CRM',
    icon: Users,
    children: [
      { label: 'Leads', href: '/crm/leads', icon: UserPlus, module: 'CRM_LEADS' },
      { label: 'Customers', href: '/crm/customers', icon: UserCheck, module: 'CRM_CUSTOMERS' },
      { label: 'Deals', href: '/crm/deals', icon: Handshake, module: 'CRM_DEALS' },
    ],
  },

  {
    label: 'ERP',
    icon: Building2,
    children: [
      { label: 'Sales', href: '/erp/sales', icon: ShoppingCart, module: 'ERP_SALES' },
      { label: 'Inventory', href: '/erp/inventory', icon: Boxes, module: 'ERP_INVENTORY' },
      { label: 'Purchasing', href: '/erp/purchasing', icon: ClipboardList, module: 'ERP_PURCHASING' },
      { label: 'Accounts', href: '/erp/accounts', icon: Wallet, module: 'ERP_ACCOUNTS' },
    ],
  },

  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'REPORTS' },
  { label: 'Settings', href: '/settings', icon: Settings, module: 'SETTINGS' },
];

export default function SidebarList() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    CRM: true,
    ERP: true,
  });

  // ✅ session state
  const [allowedSet, setAllowedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json());
      const allowed: string[] = me?.session?.allowedModules || [];
      setAllowedSet(new Set(allowed));
    })();
  }, []);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // ✅ Filter MENU based on allowedModules
  const filteredMenu = useMemo(() => {
    // If session not loaded yet -> you can show nothing or skeleton
    // Here we show only when loaded. If allowedSet empty, it may be legit too.
    const filterItem = (item: MenuItem): MenuItem | null => {
      if (item.children?.length) {
        const kids = item.children
          .map(filterItem)
          .filter(Boolean) as MenuItem[];

        // group ko tabhi show karo jab koi child allowed ho
        if (kids.length === 0) return null;

        return { ...item, children: kids };
      }

      // leaf item
      if (!item.module) return null;
      return allowedSet.has(item.module) ? item : null;
    };

    return MENU.map(filterItem).filter(Boolean) as MenuItem[];
  }, [allowedSet]);

  const base3D = 'transition-all duration-300 ease-out transform rounded';
  const hover3D =
    'hover:-translate-y-[1px] hover:shadow-lg hover:bg-gradient-to-r hover:from-zinc-100 hover:to-blue-100';
  const active3D =
    'bg-gradient-to-r from-zinc-100 to-blue-100 shadow-lg -translate-y-[1px]';

  return (
    <ul className="space-y-2">
      {filteredMenu.map(item => {
        const isActive = item.href && pathname === item.href;
        const Icon = item.icon;

        return (
          <li key={item.label}>
            {item.children ? (
              <>
                <div
                  onClick={() => toggleMenu(item.label)}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center
                    ${base3D} ${hover3D}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-gray-500 " />
                    <span className='font-semibold text-gray-800'>{item.label}</span>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 text-gray-500 ${
                      openMenus[item.label] ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <ul
                  className={`pl-8 overflow-hidden transition-all duration-300 ease-in-out ${
                    openMenus[item.label]
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  {item.children.map(child => {
                    const isChildActive = pathname === child.href;
                    const ChildIcon = child.icon;

                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href!}
                          className={`flex items-center gap-2 px-2 py-1 text-gray-700
                            ${base3D} ${hover3D}
                            ${isChildActive ? active3D : ''}`}
                        >
                          <ChildIcon size={16} className="text-gray-500" />
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <Link
                href={item.href!}
                className={`flex items-center gap-2 px-3 py-2
                  ${base3D} ${hover3D}
                  ${isActive ? active3D : ''}`}
              >
                <Icon size={18} className="text-gray-600" />
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
