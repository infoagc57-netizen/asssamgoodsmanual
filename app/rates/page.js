"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import ExcelUploadDialog from "../../components/rates/ExcelUploadDialog";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_rate_master";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const customerLabel = (rate) => (rate.generalRate ? "General Rate" : rate.customerName || rate.customerId || "-");
const routeLabel = (rate) => `${rate.fromBranchName || rate.fromBranch || "-"} → ${rate.toBranchName || rate.toBranch || rate.toStation || "-"}`;

const nextRateId = (rates) => {
  const next = rates.reduce((max, rate) => Math.max(max, Number(String(rate.id).replace("RATE", "")) || 0), 0) + 1;
  return `RATE${String(next).padStart(4, "0")}`;
};

const stationKey = (value) => String(value || "").trim().toLowerCase();

const matchesGeneralStation = (rate, station) => {
  if (!rate?.generalRate) return false;
  const key = stationKey(station);
  return (
    stationKey(rate.toStation) === key
    || stationKey(rate.toBranchName) === key
    || stationKey(rate.toBranch) === key
  );
};

const titleCaseStation = (station) => String(station || "").trim().replace(/\b\w/g, (char) => char.toUpperCase());

const readRatesFromStorage = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const mergeRateRecords = (lists) => {
  const byId = new Map();
  lists.flat().forEach((item) => {
    if (item?.id) byId.set(item.id, item);
  });
  return Array.from(byId.values());
};

export default function RatesPage() {
  const [rates, setRates] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRates = () => {
    setRates(readRatesFromStorage());
  };

  useEffect(() => { loadRates(); }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleImportRates = (parsedRates) => {
    const fromStorage = readRatesFromStorage();
    const existing = mergeRateRecords([fromStorage, rates]);
    const now = new Date().toISOString();
    const effectiveFrom = today();
    let importedCount = 0;
    const nextRates = [...existing];

    parsedRates.forEach(({ station, rate, godown_address, godown_mobile }) => {
      const trimmedStation = String(station || "").trim();
      const rateValue = Number(rate);
      if (!trimmedStation || !Number.isFinite(rateValue) || rateValue <= 0) return;
      const godownAddress = String(godown_address || "").trim();
      const godownMobile = String(godown_mobile || "").trim();

      const index = nextRates.findIndex((item) => matchesGeneralStation(item, trimmedStation));
      if (index >= 0) {
        nextRates[index] = {
          ...nextRates[index],
          toStation: trimmedStation,
          toBranch: trimmedStation,
          toBranchName: titleCaseStation(trimmedStation),
          rate: rateValue,
          rateType: nextRates[index].rateType || "Per Kg",
          godownAddress: godownAddress || nextRates[index].godownAddress || "",
          godownMobile: godownMobile || nextRates[index].godownMobile || "",
          effectiveFrom,
          status: "Active",
          updatedAt: now,
        };
      } else {
        nextRates.push({
          id: nextRateId(nextRates),
          customerId: "",
          customerName: "General Rate",
          generalRate: true,
          fromBranch: "",
          fromBranchName: "All",
          toStation: trimmedStation,
          toBranch: trimmedStation,
          toBranchName: titleCaseStation(trimmedStation),
          rate: rateValue,
          rateType: "Per Kg",
          godownAddress,
          godownMobile,
          minFreight: 0,
          effectiveFrom,
          status: "Active",
          createdAt: now,
          updatedAt: now,
        });
      }
      importedCount += 1;
    });

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRates));
    setRates(nextRates);
    const preserved = nextRates.length - importedCount;
    setToast(
      `${importedCount} rate(s) imported · ${nextRates.length} total (${preserved} existing preserved)`,
    );
  };

  const disableRate = (id) => {
    const updated = rates.map((rate) => rate.id === id ? { ...rate, status: "Inactive", updatedAt: new Date().toISOString() } : rate);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRates(updated);
  };

  const requestDeleteRate = (rateId) => {
    const rate = rates.find((item) => item.id === rateId);
    if (!rate) return;
    setDeleteTarget(rate);
  };

  const confirmDeleteRate = () => {
    if (!deleteTarget?.id) return;
    const updated = rates.filter((rate) => rate.id !== deleteTarget.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRates(updated);
    setDeleteTarget(null);
    setToast("Rate deleted successfully");
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Upload Excel
              </button>
              <a href="/rates/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Rate</a>
            </div>
          </div>

          {toast && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {toast}
            </div>
          )}

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
                          <button type="button" onClick={() => disableRate(rate.id)} className="mr-3 text-slate-500 hover:text-red-600">Disable</button>
                        )}
                        <button type="button" onClick={() => requestDeleteRate(rate.id)} className="text-red-600 hover:text-red-700">Delete</button>
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
      <ExcelUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImport={handleImportRates}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-rate-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card-lg"
          >
            <h2 id="delete-rate-title" className="text-lg font-bold" style={{ color: NAVY }}>
              Delete this rate?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Remove rate for{" "}
              <strong>{deleteTarget.toStation || deleteTarget.toBranchName || deleteTarget.toBranch || "Unknown"}</strong>
              {" "}({deleteTarget.id})? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRate}
                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
