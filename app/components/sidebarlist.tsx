"use client";

import Link from "next/link";
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
  Shield,
  Building,
  FileText,
  Receipt,
  Package,
  Truck,
  ListChecks,
  Banknote,
  BookOpen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AppModule } from "@/types/modules";
import { hasAccess } from "@/types/modules";

type MenuItem = {
  label: string;
  href?: string;
  icon?: any;
  module?: AppModule;
  adminOnly?: boolean;
  children?: MenuItem[];
};

const MENU: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },

  {
    label: "CRM",
    icon: Users,
    children: [
      { label: "Leads", href: "/crm/leads", icon: UserPlus, module: "CRM_LEADS" },
      { label: "Follow up", href: "/crm/followups", icon: UserCheck, module: "CRM_FOLLOWUPS" },
      { label: "Deals", href: "/crm/deals", icon: Handshake, module: "CRM_DEALS" },
    ],
  },

  {
    label: "ERP",
    icon: Building2,
    children: [
      {
        label: "Sales",
        icon: ShoppingCart,
        children: [
          { label: "Customers", href: "/erp/sales/customers", icon: Building, module: "ERP_CUSTOMERS" },
          { label: "Quotations", href: "/erp/sales/quotations", icon: FileText, module: "ERP_QUOTATIONS" },
          { label: "Invoices", href: "/erp/sales/invoices", icon: Receipt, module: "ERP_INVOICES" },
        ],
      },

      {
        label: "Inventory",
        icon: Boxes,
        children: [
          { label: "Items / Services", href: "/erp/inventory/items", icon: Package, module: "ERP_ITEMS_SERVICES" },
        ],
      },

      {
        label: "Purchasing",
        icon: ClipboardList,
        children: [
          { label: "Vendors", href: "/erp/purchasing/vendors", icon: Truck, module: "ERP_VENDORS" },
          { label: "Purchase Orders", href: "/erp/purchasing/purchase-orders", icon: ListChecks, module: "ERP_PURCHASE_ORDERS" },
        ],
      },

      {
        label: "Accounts",
        icon: Wallet,
        children: [
          { label: "Expenses", href: "/erp/accounts/expenses", icon: Banknote, module: "ERP_EXPENSES" },
          { label: "Payments", href: "/erp/accounts/payments", icon: Wallet, module: "ERP_PAYMENTS" },
          { label: "Ledger", href: "/erp/accounts/ledger", icon: BookOpen, module: "ERP_LEDGER" },
        ],
      },
    ],
  },

  { label: "Reports", href: "/reports", icon: BarChart3, module: "REPORTS" },
  { label: "Settings", href: "/settings", icon: Settings, module: "SETTINGS" },

  // ✅ Admin page (no module key, adminOnly=true)
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

export default function SidebarList() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    CRM: true,
    ERP: true,
    Sales: true,
    Inventory: true,
    Purchasing: true,
    Accounts: true,
  });

  const [allowedSet, setAllowedSet] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const me = await r.json();
        const session = me?.session;

        if (!session) {
          if (mounted) setLoaded(true);
          router.replace("/auth/login");
          return;
        }

        const fromApi: string[] = session?.allowedModules || [];
        const allowed = Array.from(new Set(["DASHBOARD", ...fromApi]));

        if (mounted) {
          setAllowedSet(new Set(allowed));
          setIsAdmin(Boolean(session?.isOwner) || session?.role === "ADMIN");
          setLoaded(true);
        }
      } catch {
        if (mounted) setLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredMenu = useMemo(() => {
    if (!loaded) return [];

    const filterItem = (item: MenuItem): MenuItem | null => {
      // ✅ Admin gating
      if (item.adminOnly && !isAdmin) return null;

      // ✅ Children recursion
      if (item.children?.length) {
        const kids = item.children.map(filterItem).filter(Boolean) as MenuItem[];
        if (kids.length === 0) return null;
        return { ...item, children: kids };
      }

      // ✅ IMPORTANT FIX: Admin link has no module, still allow it if admin
      if (item.adminOnly && item.href) return item;

      // ✅ Normal leaf module gating
      if (!item.module) return null;
      return hasAccess(allowedSet, item.module) ? item : null;
    };

    return MENU.map(filterItem).filter(Boolean) as MenuItem[];
  }, [allowedSet, loaded, isAdmin]);

  const toggleMenu = (label: string) => setOpenMenus((p) => ({ ...p, [label]: !p[label] }));

  if (!loaded) return null;

  const base3D = "transition-all duration-300 ease-out transform rounded";
  const hover3D =
    "hover:-translate-y-[1px] hover:shadow-lg hover:bg-gradient-to-r hover:from-zinc-100 hover:to-blue-200";
  const active3D = "bg-gradient-to-r from-zinc-100 to-blue-300 shadow-lg -translate-y-[1px]";

  function isAnyChildActive(item: MenuItem): boolean {
    if (!item.children?.length) return Boolean(item.href && pathname === item.href);
    return item.children.some((c) => isAnyChildActive(c));
  }

  return (
    <ul className="space-y-2">
      {filteredMenu.map((item) => {
        const isActive = item.href && pathname === item.href;
        const Icon = item.icon;
        const parentActive = item.children ? isAnyChildActive(item) : false;

        return (
          <li key={item.label}>
            {item.children ? (
              <>
                <div
                  onClick={() => toggleMenu(item.label)}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center ${base3D} ${hover3D} ${
                    parentActive ? active3D : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-gray-500" />
                    <span className="font-semibold text-gray-800">{item.label}</span>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 text-gray-500 ${
                      openMenus[item.label] ? "rotate-180" : ""
                    }`}
                  />
                </div>

                <ul
                  className={`pl-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    openMenus[item.label] ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {item.children.map((child) => {
                    const childHasKids = Boolean(child.children?.length);
                    const ChildIcon = child.icon;
                    const childParentActive = childHasKids ? isAnyChildActive(child) : false;

                    return (
                      <li key={child.href || child.label} className="mt-2">
                        {childHasKids ? (
                          <>
                            <div
                              onClick={() => toggleMenu(child.label)}
                              className={`px-2 py-2 cursor-pointer flex justify-between items-center ${base3D} ${hover3D} ${
                                childParentActive ? active3D : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <ChildIcon size={16} className="text-gray-500" />
                                <span className="font-semibold text-gray-800">{child.label}</span>
                              </div>

                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-300 text-gray-500 ${
                                  openMenus[child.label] ? "rotate-180" : ""
                                }`}
                              />
                            </div>

                            <ul
                              className={`pl-6 overflow-hidden transition-all duration-300 ease-in-out ${
                                openMenus[child.label] ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              {child.children!.map((leaf) => {
                                const isLeafActive = leaf.href && pathname === leaf.href;
                                const LeafIcon = leaf.icon;

                                return (
                                  <li key={leaf.href || leaf.label} className="mt-1">
                                    <Link
                                      href={leaf.href!}
                                      className={`flex items-center gap-2 px-2 py-1 text-gray-700 ${base3D} ${hover3D} ${
                                        isLeafActive ? active3D : ""
                                      }`}
                                    >
                                      <LeafIcon size={16} className="text-gray-500" />
                                      {leaf.label}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        ) : (
                          <Link
                            href={child.href!}
                            className={`flex items-center gap-2 px-2 py-1 text-gray-700 ${base3D} ${hover3D} ${
                              pathname === child.href ? active3D : ""
                            }`}
                          >
                            <ChildIcon size={16} className="text-gray-500" />
                            {child.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <Link
                href={item.href!}
                className={`flex items-center gap-2 px-3 py-2 ${base3D} ${hover3D} ${isActive ? active3D : ""}`}
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