'use client';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

type MenuItem = {
  label: string;
  href?: string;
  color?: string;
  children?: MenuItem[];
};

const MENU: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  {
    label: 'CRM',
    children: [
      { label: 'Leads', href: '/crm/leads' },
      { label: 'Customers', href: '/crm/customers' },
      { label: 'Deals', href: '/crm/deals' },
    ],
  },
  {
    label: 'ERP',
    children: [
      { label: 'Sales', href: '/erp/sales' },
      { label: 'Inventory', href: '/erp/inventory' },
      { label: 'Purchasing', href: '/erp/purchasing' },
      { label: 'Accounts', href: '/erp/accounts' },
    ],
  },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];

export default function SidebarList() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    CRM: true,
    ERP: true,
  });

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  /* 🔹 Light 3D Zinc + Blue Gradient */
  const base3D =
    'transition-all duration-300 ease-out transform rounded';

  const hover3D =
    'hover:-translate-y-[1px] hover:shadow-lg hover:bg-gradient-to-r hover:from-zinc-100 hover:to-blue-100';

  const active3D =
    'bg-gradient-to-r from-zinc-100 to-blue-100 shadow-lg -translate-y-[1px]';

  return (
    <ul className="space-y-2">
      {MENU.map(item => {
        const isActive = item.href && pathname === item.href;

        return (
          <li key={item.label}>
            {/* Parent with children */}
            {item.children ? (
              <>
                <div
                  onClick={() => toggleMenu(item.label)}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center
                    ${base3D} ${hover3D}
                  `}
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${
                      openMenus[item.label] ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <ul
                  className={`pl-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    openMenus[item.label]
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  {item.children.map(child => {
                    const isChildActive = pathname === child.href;

                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href!}
                          className={`block px-2 py-1 text-gray-700
                            ${base3D} ${hover3D}
                            ${isChildActive ? active3D : ''}
                          `}
                        >
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
                className={`block px-3 py-2
                  ${base3D} ${hover3D}
                  ${isActive ? active3D : ''}
                `}
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
