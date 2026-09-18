"use client";

import { useState } from "react";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
} from "lucide-react";

export default function Navbar({ onMenuToggle, collapsed = false }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="agc-navbar sticky top-0 z-30 h-16 border-b border-[#E5E7EB] bg-white">
      <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onMenuToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#1F2937] hover:bg-[#F5F7FA]"
          aria-label={collapsed ? "Expand sidebar" : "Toggle menu"}
          aria-expanded={!collapsed}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden justify-center md:flex">
          <div
            className={`flex items-center gap-2 rounded-xl border bg-[#F5F7FA] px-3 py-2 transition-all ${
              searchFocused
                ? "w-full max-w-xl border-orange-300 bg-white ring-2 ring-orange-100"
                : "w-full max-w-xl border-[#E5E7EB]"
            }`}
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              placeholder="Search bookings, shipments, customers..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-transparent text-sm text-[#1F2937] placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#1F2937] hover:bg-[#F5F7FA]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#F97316] ring-2 ring-white" />
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-2 py-1.5 hover:bg-[#F5F7FA]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071B34] text-xs font-semibold text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-semibold text-[#1F2937]">Admin User</span>
                <span className="text-[10px] text-slate-500">Administrator</span>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-card-lg">
                  <div className="border-b border-[#E5E7EB] px-4 py-3">
                    <p className="text-sm font-semibold text-[#1F2937]">Admin User</p>
                    <p className="text-xs text-slate-500">admin@agcmanual.com</p>
                  </div>
                  <div className="py-1">
                    <a href="/profile" className="block px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F5F7FA]">Profile Settings</a>
                    <a href="/settings" className="block px-4 py-2 text-sm text-[#1F2937] hover:bg-[#F5F7FA]">System Settings</a>
                  </div>
                  <div className="border-t border-[#E5E7EB] py-1">
                    <a href="/logout" className="block px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">Sign out</a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
