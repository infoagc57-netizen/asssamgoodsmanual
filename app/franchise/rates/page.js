"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pl-10 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FranchiseRatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/franchise/rates", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load rates");
        if (!cancelled) setRates(data.rates || []);
      } catch (err) {
        if (!cancelled) {
          setRates([]);
          setError(err.message || "Failed to load rates");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter((rate) => {
      const from = String(rate.fromStation || "").toLowerCase();
      const to = String(rate.toStation || "").toLowerCase();
      return from.includes(q) || to.includes(q);
    });
  }, [rates, search]);

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            Rate Master
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
            Rate List
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Active freight rates for booking. Read-only view.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="mb-5 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={inputClass}
            placeholder="Search by from / to station"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "From Station",
                    "To Station",
                    "Rate Type",
                    "Rate",
                    "Min Weight",
                    "Max Weight",
                    "Min Charge",
                    "Transit Days",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-16 text-center text-sm text-slate-500">
                      Loading rates…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((rate) => (
                    <tr key={rate.id} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{rate.fromStation || "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{rate.toStation || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.rateType || "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold" style={{ color: NAVY }}>
                        {money(rate.rate)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.minWeight || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.maxWeight || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{money(rate.minCharge)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.transitDays || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-20 text-center">
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>
                        No active rates found.
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Contact admin if the rate list looks empty.</p>
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
