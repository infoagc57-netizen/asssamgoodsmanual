"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Users,
  MapPin,
  FileText,
  DollarSign,
  Wallet,
  BookOpen,
  User,
} from "lucide-react";

const clsx = (...classes) => classes.filter(Boolean).join(" ");

const menuSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/franchise/dashboard", icon: LayoutDashboard },
      { label: "New Booking", href: "/franchise/bookings/new", icon: PlusCircle },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "My Bookings", href: "/franchise/bookings", icon: Package },
      { label: "My Customers", href: "/franchise/customers", icon: Users },
      { label: "Track Shipment", href: "/franchise/track", icon: MapPin },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "My Wallet", href: "/franchise/wallet", icon: Wallet },
      { label: "My Commission", href: "/franchise/commission", icon: DollarSign },
      { label: "My Ledger", href: "/franchise/ledger", icon: BookOpen },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Rate List", href: "/franchise/rates", icon: FileText },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/franchise/profile", icon: User },
    ],
  },
];

export default function FranchiseSidebar({ mobileOpen = false, collapsed = false, onClose }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [tooltip, setTooltip] = useState(null);

  const visibleSections = useMemo(
    () =>
      menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.adminOnly || role === "franchise"),
        }))
        .filter((section) => section.items.length > 0),
    [role],
  );

  return (
    <>
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}
    <aside
      className={clsx(
        "sidebar fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/10 bg-[#071B34] text-white duration-300",
        "transition-[width,transform]",
        collapsed ? "w-60 lg:w-[72px]" : "w-60",
        mobileOpen
          ? "translate-x-0"
          : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0",
      )}
    >
      <div
        className={clsx(
          "flex min-h-[88px] items-center border-b border-white/10",
          collapsed ? "justify-between px-4 lg:justify-center lg:px-2" : "px-4",
        )}
      >
        <div className={clsx("min-w-0", collapsed && "lg:hidden")}>
          <p className="truncate text-sm font-bold tracking-tight text-white">Assam Goods Carrier</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F97316]">
            Franchise Portal
          </p>
        </div>
        <img
          src="/brand/agc-logo.jpg"
          alt="Assam Goods Carrier"
          className={clsx("hidden h-[46px] w-auto object-contain", collapsed && "lg:block")}
        />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className={clsx(
              "px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40",
              collapsed && "lg:hidden",
            )}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href
                  || (item.href !== "/franchise/dashboard" && pathname?.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="block"
                    onMouseEnter={(event) => {
                      if (!collapsed || !window.matchMedia("(min-width: 1024px)").matches) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      setTooltip({
                        label: item.label,
                        top: rect.top + rect.height / 2,
                        left: rect.right + 12,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div
                      className={clsx(
                        "flex cursor-pointer items-center rounded-xl py-2.5 transition-all",
                        collapsed ? "gap-3 px-4 lg:justify-center lg:gap-0 lg:px-0" : "gap-3 px-3",
                        active
                          ? "bg-[#0B1F3A] text-white shadow-inner ring-1 ring-[#F97316]/70"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <item.icon className={clsx("h-5 w-5 shrink-0", active && "text-[#F97316]")} />
                      <span className={clsx("whitespace-nowrap text-sm", collapsed && "lg:hidden")}>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
    {tooltip && (
      <div
        className="pointer-events-none fixed z-[60] hidden -translate-y-1/2 rounded-md bg-[#071B34] px-2.5 py-1 text-xs font-medium text-white shadow-lg lg:block"
        style={{ top: tooltip.top, left: tooltip.left }}
      >
        {tooltip.label}
      </div>
    )}
    </>
  );
}
