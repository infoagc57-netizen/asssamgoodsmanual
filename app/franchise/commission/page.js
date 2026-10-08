"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Wallet } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FranchiseCommissionPage() {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({
    totalCommission: 0,
    thisMonthCommission: 0,
    pendingCommission: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/franchise/commission", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load commission");
        if (!cancelled) {
          setBookings(data.bookings || []);
          setSummary({
            totalCommission: data.summary?.totalCommission ?? 0,
            thisMonthCommission: data.summary?.thisMonthCommission ?? 0,
            pendingCommission: data.summary?.pendingCommission ?? 0,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load commission");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Total Commission",
      value: money(summary.totalCommission),
      hint: "All-time markup earned",
      icon: Wallet,
      tone: "text-sky-700 bg-sky-50",
    },
    {
      label: "This Month",
      value: money(summary.thisMonthCommission),
      hint: "Markup this month",
      icon: IndianRupee,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pending",
      value: money(summary.pendingCommission),
      hint: "On open shipments",
      icon: Wallet,
      tone: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            Earnings
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
            My Commission
          </h1>
          <p className="mt-1 text-sm text-slate-500">Markup earned on your franchise bookings.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((item) => (
            <section key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-gray-500">{item.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
                {loading ? "…" : item.value}
              </p>
              <p className="mt-3 text-xs font-medium text-gray-500">{item.hint}</p>
            </section>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["LR Number", "Date", "Consignor", "Consignee", "Route", "Base Freight", "Commission", "Status"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-16 text-center text-sm text-slate-500">
                      Loading commission…
                    </td>
                  </tr>
                ) : bookings.length ? (
                  bookings.map((row) => (
                    <tr key={row.id} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>
                        {row.lrNumber}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{row.date || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.consignorName || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.consigneeName || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {(row.route?.from || "—") + " → " + (row.route?.to || "—")}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{money(row.baseFreight)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-orange-700">{money(row.markup)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{row.status || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-20 text-center">
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>
                        No commission yet.
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Add markup on bookings to start earning commission.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FranchiseLayout>
  );
}
