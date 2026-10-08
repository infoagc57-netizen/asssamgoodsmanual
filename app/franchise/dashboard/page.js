"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  IndianRupee,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Route,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const REFRESH_MS = 60_000;

const emptySnapshot = {
  greeting: "Good day",
  todayLabel: "",
  todayBookings: 0,
  todayRevenue: 0,
  activeTrips: 0,
  totalTrips: 0,
  inTransit: 0,
  delivered: 0,
  pendingPod: 0,
  customers: 0,
  branches: 0,
  vehicles: 0,
  outstanding: 0,
  toPayPending: 0,
  tbbPending: 0,
  vendorPayable: 0,
  booked: 0,
  loaded: 0,
  arrived: 0,
  totalBookings: 0,
  activity: [],
  branchSnapshot: [],
  generatedAt: null,
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const activityTime = (value) => {
  const stamp = Date.parse(value || "");
  if (Number.isNaN(stamp)) return { sort: 0, label: value || "" };
  const date = new Date(stamp);
  return {
    sort: stamp,
    label: date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const greetingForHour = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const activityTone = (title) => {
  const value = String(title || "").toLowerCase();
  if (value.includes("pod") || value.includes("delivered")) return { bg: "bg-emerald-50", fg: "text-emerald-600" };
  if (value.includes("hold") || value.includes("damaged")) return { bg: "bg-rose-50", fg: "text-rose-600" };
  if (value.includes("picked") || value.includes("booked")) return { bg: "bg-orange-50", fg: "text-orange-600" };
  return { bg: "bg-sky-50", fg: "text-sky-700" };
};

function mergeStatsPayload(payload) {
  const now = new Date();
  const activity = (payload.activity || []).map((item) => {
    const time = activityTime(item.stamp);
    return { ...item, stamp: time.label, sort: time.sort };
  });

  return {
    greeting: greetingForHour(now.getHours()),
    todayLabel: now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    todayBookings: payload.todayBookings ?? 0,
    todayRevenue: payload.todayRevenue ?? 0,
    activeTrips: payload.activeTrips ?? 0,
    totalTrips: payload.totalTrips ?? payload.activeTrips ?? 0,
    inTransit: payload.inTransit ?? 0,
    delivered: payload.delivered ?? 0,
    pendingPod: payload.pendingPod ?? 0,
    customers: payload.customers ?? 0,
    branches: payload.branches ?? 0,
    vehicles: payload.vehicles ?? 0,
    outstanding: payload.outstanding ?? 0,
    toPayPending: payload.toPayPending ?? 0,
    tbbPending: payload.tbbPending ?? 0,
    vendorPayable: payload.vendorPayable ?? 0,
    booked: payload.booked ?? 0,
    loaded: payload.loaded ?? 0,
    arrived: payload.arrived ?? 0,
    totalBookings: payload.totalBookings ?? 0,
    activity,
    branchSnapshot: payload.branchSnapshot ?? [],
    generatedAt: payload.generatedAt ?? null,
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Franchise";
  const [data, setData] = useState(emptySnapshot);
  const [wallet, setWallet] = useState({
    balance: 0,
    creditLimit: 0,
    creditUsed: 0,
    availableWithCredit: 0,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/franchise/dashboard/stats", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load dashboard stats");
      }
      setData(mergeStatsPayload(payload));
      setFetchError("");
    } catch (err) {
      setFetchError(err.message || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/franchise/wallet", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load wallet");
      }
      setWallet({
        balance: Number(payload.wallet?.balance) || 0,
        creditLimit: Number(payload.wallet?.creditLimit) || 0,
        creditUsed: Number(payload.wallet?.creditUsed) || 0,
        availableWithCredit: Number(payload.wallet?.availableWithCredit) || 0,
        isActive: payload.wallet?.isActive !== false,
      });
    } catch {
      // Keep last known wallet values; dashboard stats error is shown separately
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshWallet();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
        refreshWallet();
      }
    };

    const interval = window.setInterval(refreshIfVisible, REFRESH_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [refresh, refreshWallet]);

  const lastUpdatedLabel = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "—";

  const kpis = [
    { label: "Today's Bookings", value: data.todayBookings, hint: "LRs created today", icon: ClipboardList, tone: "text-blue-600 bg-blue-50" },
    { label: "In Transit", value: data.inTransit, hint: "Shipments on the road", icon: Truck, tone: "text-orange-600 bg-orange-50" },
    { label: "Delivered", value: data.delivered, hint: "Closed deliveries", icon: PackageCheck, tone: "text-green-600 bg-green-50" },
    { label: "This Month Bookings", value: data.todayBookings, hint: "Bookings this month", icon: ClipboardList, tone: "text-purple-600 bg-purple-50" },
    { label: "Customers", value: data.customers, hint: "Saved parties (MongoDB)", icon: Users, tone: "text-indigo-600 bg-indigo-50" },
    { label: "Total LRs", value: data.totalBookings, hint: "All bookings in system", icon: Truck, tone: "text-orange-600 bg-orange-50" },
  ];

  const financeCards = [
    { label: "This Month Commission", value: money(0), hint: "Markup earnings this month", icon: IndianRupee, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Pending Payment", value: money(data.outstanding), hint: "Commission pending from admin", icon: Wallet, tone: "text-rose-600 bg-rose-50" },
    { label: "To Pay Pending", value: money(data.toPayPending), hint: "Consignee receivables", icon: IndianRupee, tone: "text-orange-600 bg-orange-50" },
    { label: "Total Commission", value: money(0), hint: "All-time markup earned", icon: Wallet, tone: "text-sky-700 bg-sky-50" },
  ];

  const statusRows = [
    { label: "Booked", value: data.booked, color: "#3B82F6" },
    { label: "Loaded", value: data.loaded, color: "#6366F1" },
    { label: "In Transit", value: data.inTransit, color: "#F97316" },
    { label: "Arrived", value: data.arrived, color: "#8B5CF6" },
    { label: "Delivered", value: data.delivered, color: "#22C55E" },
  ];
  const statusTotal = Math.max(1, data.totalBookings);

  const actions = [
    { href: "/franchise/bookings/new", label: "New Booking", icon: Plus, primary: true },
    { href: "/franchise/customers", label: "My Customers", icon: Users, primary: false },
    { href: "/franchise/bookings", label: "My Bookings", icon: ClipboardList, primary: false },
    { href: "/franchise/rates", label: "Rate List", icon: IndianRupee, primary: false },
  ];

  return (
    <FranchiseLayout>
      <div className="relative mb-6 overflow-hidden rounded-2xl p-6 sm:p-8" style={{ backgroundColor: NAVY }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: ORANGE }} />
          <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: ORANGE }} />
        </div>
        <div className="relative flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ORANGE }}>Franchise Portal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{data.greeting}, {userName}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/60">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {data.todayLabel || "Today"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Last updated: {loading && !data.generatedAt ? "Loading…" : lastUpdatedLabel}
              {fetchError ? ` · ${fetchError}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:flex-1">
              {[
                { label: "Today's Bookings", value: data.todayBookings },
                { label: "Today's Commission", value: money(data.todayRevenue) },
                { label: "My Customers", value: data.customers },
                {
                  label: "Wallet Balance",
                  value: money(wallet.balance),
                  positive: Number(wallet.balance) > 0,
                },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-white/50 sm:text-[11px]">{item.label}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-lg font-bold text-white sm:text-xl">
                    <span className="truncate">{item.value}</span>
                    {item.positive ? (
                      <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" title="Positive balance" />
                    ) : null}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-shrink-0 lg:self-stretch">
              <Link
                href="/franchise/bookings/new"
                className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-white bg-white px-4 text-sm font-bold shadow-lg transition-all hover:bg-white/95 hover:shadow-xl"
                style={{ color: NAVY }}
              >
                <Plus className="h-4 w-4 shrink-0" />
                New Booking
              </Link>
              <Link
                href="/franchise/rates"
                className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-orange-500 bg-orange-500 px-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 hover:shadow-xl"
              >
                <Calculator className="h-4 w-4 shrink-0" />
                Rate List
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Wallet
            </p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
              <Wallet className="h-7 w-7 shrink-0 text-orange-500" />
              {money(wallet.balance)}
            </p>
            {Number(wallet.balance) === 0 && (
              <p className="mt-1 text-sm text-slate-500">Add money to start booking</p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Total spending power:{" "}
              <span className="font-semibold" style={{ color: NAVY }}>
                {money(wallet.availableWithCredit)}
              </span>{" "}
              (Balance + Credit)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!wallet.isActive ? (
              <>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
                  Frozen
                </span>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-[42px] cursor-not-allowed items-center justify-center rounded-xl px-5 text-sm font-semibold text-white opacity-50"
                  style={{ backgroundColor: ORANGE }}
                >
                  + Add Money
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/franchise/wallet/recharge"
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Plus className="h-4 w-4" />
                  Add Money
                </Link>
                <Link
                  href="/franchise/wallet"
                  className="inline-flex h-[42px] items-center justify-center rounded-xl border-2 px-5 text-sm font-semibold"
                  style={{ borderColor: NAVY, color: NAVY }}
                >
                  View Wallet →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <section key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">{item.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>{item.value}</p>
            <p className="mt-3 text-xs font-medium text-gray-500">{item.hint}</p>
          </section>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {financeCards.map((item) => (
          <section key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">{item.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>{item.value}</p>
            <p className="mt-3 text-xs font-medium text-gray-500">{item.hint}</p>
          </section>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Shipment Status Overview</h2>
            <p className="mt-0.5 text-xs text-gray-500">{data.totalBookings} LRs across the network</p>
          </div>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {statusRows.map((row) => (
            <span
              key={row.label}
              className="h-full"
              style={{ width: `${(row.value / statusTotal) * 100}%`, backgroundColor: row.color }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statusRows.map((row) => (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </span>
                <span className="text-sm font-bold" style={{ color: NAVY }}>{row.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(row.value / statusTotal) * 100}%`, backgroundColor: row.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-50 px-6 py-4">
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Recent Activity</h2>
            <p className="mt-0.5 text-xs text-gray-500">Latest bookings and tracking updates</p>
          </div>
          {data.activity.length ? (
            <ol className="relative ml-4 space-y-0 border-l border-slate-200 py-2 pl-8 pr-4 sm:ml-6">
              {data.activity.map((item) => {
                const tone = activityTone(item.title);
                return (
                  <li key={item.id} className="relative py-4">
                    <span className={`absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full ${tone.bg} ${tone.fg}`}>
                      <MapPin className="h-4 w-4" />
                    </span>
                    <a href={item.href} className="block rounded-xl px-2 py-1 hover:bg-slate-50">
                      <p className="text-[11px] font-medium text-gray-400">{item.stamp}</p>
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: NAVY }}>{item.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                    </a>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-gray-500">No activity yet</div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>Quick Actions</h2>
              <p className="mt-0.5 text-xs text-gray-500">Jump straight into work</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {actions.map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl px-3 py-4 text-center text-sm font-medium transition ${
                    action.primary ? "text-white hover:opacity-90" : "border border-gray-100 text-gray-700 hover:bg-gray-50"
                  }`}
                  style={action.primary ? { backgroundColor: ORANGE } : undefined}
                >
                  <action.icon className="h-5 w-5" />
                  {action.label}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>My Top Routes</h2>
              <p className="mt-0.5 text-xs text-gray-500">Your most active routes</p>
            </div>
            {data.branchSnapshot.length ? (
              <div className="space-y-4 p-5">
                {data.branchSnapshot.map((branch) => (
                  <div key={branch.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{branch.name}</p>
                      <p className="shrink-0 text-xs font-semibold text-gray-500">{branch.count} LR</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${branch.percent}%`, backgroundColor: ORANGE }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-gray-500">No branch movement yet</div>
            )}
          </section>
        </div>
      </div>
    </FranchiseLayout>
  );
}
