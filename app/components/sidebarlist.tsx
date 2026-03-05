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
  Boxes,
  ShoppingCart,
  Truck,
  Building,
  Package,
  PlusSquare,
  Scale,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings,
  Shield,
  Tags,
  RotateCcw, // ✅ NEW: returns icon
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
      // Contacts
      {
        label: "Contacts",
        icon: Users,
        children: [
          { label: "Suppliers", href: "/erp/suppliers", icon: Truck, module: "ERP_SUPPLIERS" },
          { label: "Customers", href: "/erp/customers", icon: Building, module: "ERP_CUSTOMERS" },
        ],
      },

      // Products
      {
        label: "Products",
        icon: Boxes,
        children: [
          { label: "List of Products", href: "/erp/products/list-of-product", icon: Package, module: "ERP_PRODUCTS_LIST" },
          { label: "Add New Product", href: "/erp/products/new", icon: PlusSquare, module: "ERP_PRODUCTS_ADD" },

          { label: "Categories", href: "/erp/products/categories", icon: Tags, module: "ERP_CATEGORIES" },
          { label: "Units", href: "/erp/products/units", icon: Scale, module: "ERP_UNITS" },
        ],
      },

      // Purchase
      {
        label: "Purchase",
        icon: ShoppingCart,
        children: [
          { label: "Purchase Order", href: "/erp/purchase/order", icon: ClipboardList, module: "ERP_PURCHASE_ORDER" },
          { label: "List Purchase", href: "/erp/purchase/list", icon: Receipt, module: "ERP_PURCHASE_LIST" },
          { label: "Add Purchase", href: "/erp/purchase/new", icon: PlusSquare, module: "ERP_PURCHASE_ADD" },

          // ✅ NEW: Purchase Returns (single page)
          { label: "Purchase Returns", href: "/erp/purchase/return", icon: RotateCcw, module: "ERP_PURCHASE_RETURN_LIST" },
        ],
      },
    ],
  },

  { label: "Reports", href: "/reports", icon: BarChart3, module: "REPORTS" },
  { label: "Settings", href: "/settings", icon: Settings, module: "SETTINGS" },

  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

export default function SidebarList() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    CRM: true,
    ERP: true,
    Contacts: true,
    Products: true,
    Purchase: true,
  });

  const [allowedSet, setAllowedSet] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const r = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
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
      if (item.adminOnly && !isAdmin) return null;

      if (item.children?.length) {
        const kids = item.children.map(filterItem).filter(Boolean) as MenuItem[];
        if (kids.length === 0) return null;
        return { ...item, children: kids };
      }

      if (item.adminOnly && item.href) return item;

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
                    className={`transition-transform duration-300 text-gray-500 ${openMenus[item.label] ? "rotate-180" : ""}`}
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
                                className={`transition-transform duration-300 text-gray-500 ${openMenus[child.label] ? "rotate-180" : ""}`}
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