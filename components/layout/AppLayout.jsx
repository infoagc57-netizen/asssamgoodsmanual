"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import SessionGate from "./SessionGate";

const SIDEBAR_KEY = "agc_sidebar_collapsed";

export default function AppLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "true" : "false");
      return next;
    });
  };

  const handleMenuButton = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      toggleCollapsed();
      return;
    }
    setMobileMenuOpen(true);
  };

  return (
    <SessionGate>
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        collapsed={collapsed}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div
        className={`relative z-0 flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[72px]" : "lg:pl-60"
        }`}
      >
        <Navbar
          collapsed={collapsed}
          onMenuToggle={handleMenuButton}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
    </SessionGate>
  );
}
