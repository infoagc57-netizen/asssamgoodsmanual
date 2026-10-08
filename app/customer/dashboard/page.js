"use client";

import { signOut, useSession } from "next-auth/react";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const STATS = [
  { label: "My Bookings", value: 0 },
  { label: "My Invoices", value: 0 },
  { label: "Track Shipment", value: 0 },
];

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession();
  const userName = session?.user?.name || "Customer";

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Assam Goods Carrier
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>
              Customer Dashboard - Welcome, {userName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View your bookings, invoices, and shipment status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STATS.map((stat) => (
            <section
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color: NAVY }}>
                {stat.value}
              </p>
              <div className="mt-4 h-1 w-12 rounded-full" style={{ backgroundColor: ORANGE }} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
