"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_rate_master";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const customerLabel = (rate) => (rate.generalRate ? "General Rate" : rate.customerName || rate.customerId || "-");
const routeLabel = (rate) => `${rate.fromBranchName || rate.fromBranch || "-"} → ${rate.toBranchName || rate.toBranch || "-"}`;

export default function RatesPage() {
  const [rates, setRates] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadRates = () => {
    try {
      setRates(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      setRates([]);
    }
  };

  useEffect(() => { loadRates(); }, []);

  const disableRate = (id) => {
    const updated = rates.map((rate) => rate.id === id ? { ...rate, status: "Inactive", updatedAt: new Date().toISOString() } : rate);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRates(updated);
  };

  const visible = rates.filter((rate) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || customerLabel(rate).toLowerCase().includes(query) || routeLabel(rate).toLowerCase().includes(query);
    return matchesSearch && (!statusFilter || rate.status === statusFilter);
  });

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Rate Master</h1>
              <p className="mt-1 text-sm text-slate-500">Maintain customer and general freight rates by route.</p>
            </div>
            <a href="/rates/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Rate</a>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <input className={inputClass} placeholder="Search customer or route" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Rate ID", "Customer", "Route", "Type", "Rate", "Min Freight", "Effective Date", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length ? visible.map((rate) => (
                    <tr key={rate.id} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{rate.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{customerLabel(rate)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{routeLabel(rate)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.rateType}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{money(rate.rate)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{money(rate.minFreight)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rate.effectiveFrom || "-"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rate.status === "Inactive" ? "bg-slate-100 text-slate-500" : "bg-green-50 text-green-700"}`}>{rate.status || "Active"}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                        <a href={`/rates/${rate.id}`} className="mr-3 text-[#0B1F33] hover:text-orange-600">View</a>
                        <a href={`/rates/${rate.id}?edit=true`} className="mr-3 text-slate-500 hover:text-orange-600">Edit</a>
                        {rate.status !== "Inactive" && (
                          <button type="button" onClick={() => disableRate(rate.id)} className="text-slate-500 hover:text-red-600">Disable</button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="9" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No rates found.</div>
                        <p className="mt-1 text-xs text-slate-500">Add a rate to start building your tariff master.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
