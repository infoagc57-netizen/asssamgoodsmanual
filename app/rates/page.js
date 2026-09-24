"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const ExcelUploadDialog = dynamic(() => import("../../components/rates/ExcelUploadDialog"), {
  ssr: false,
});
import { loadRatesWithMigration } from "@/lib/rateClient";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const customerLabel = (rate) => (rate.generalRate ? "General Rate" : rate.customerName || rate.customerId || "-");
const routeLabel = (rate) => `${rate.fromBranchName || rate.fromBranch || "-"} → ${rate.toBranchName || rate.toBranch || rate.toStation || "-"}`;
const rateIdLabel = (rate) => (rate.id ? String(rate.id).slice(-8).toUpperCase() : "-");
const stationLabel = (rate) => rate.toStation || rate.toBranchName || rate.toBranch || "Unknown";

export default function RatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadRatesWithMigration();
      setRates(next);
    } catch {
      setRates([]);
      setToast("Could not load rates from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleImportRates = async (parsedRates) => {
    try {
      const response = await fetch("/api/rates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates: parsedRates }),
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || "Import failed.");
        return;
      }
      setRates(data.rates || []);
      setToast(data.message || "Rates imported.");
    } catch {
      setToast("Import failed.");
    }
  };

  const disableRate = async (id) => {
    try {
      const response = await fetch(`/api/rates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inactive" }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setRates((previous) => previous.map((rate) => (rate.id === id ? data.rate : rate)));
    } catch {
      setToast("Could not disable rate.");
    }
  };

  const requestDeleteRate = (rateId) => {
    const rate = rates.find((item) => item.id === rateId);
    if (!rate) return;
    setDeleteTarget(rate);
  };

  const confirmDeleteRate = async () => {
    if (!deleteTarget?.id) return;
    try {
      const response = await fetch(`/api/rates/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      if (!response.ok) {
        setToast("Delete failed.");
        return;
      }
      setRates((previous) => previous.filter((rate) => rate.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast("Rate deleted successfully");
    } catch {
      setToast("Delete failed.");
    }
  };

  const visible = useMemo(() => rates.filter((rate) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || customerLabel(rate).toLowerCase().includes(query) || routeLabel(rate).toLowerCase().includes(query);
    return matchesSearch && (!statusFilter || rate.status === statusFilter);
  }), [rates, search, statusFilter]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;

  const bulkDeleteRates = useMemo(
    () => rates.filter((rate) => selectedSet.has(rate.id)),
    [rates, selectedSet],
  );

  const visibleIds = useMemo(() => visible.map((rate) => rate.id).filter(Boolean), [visible]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id));

  const toggleSelectRate = (rateId) => {
    if (!rateId) return;
    setSelectedIds((previous) => (
      previous.includes(rateId)
        ? previous.filter((id) => id !== rateId)
        : [...previous, rateId]
    ));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((previous) => previous.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((previous) => [...new Set([...previous, ...visibleIds])]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setBulkDeleteOpen(false);
  };

  const requestBulkDelete = () => {
    if (selectedCount === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedCount === 0) return;
    try {
      const response = await fetch("/api/rates/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || "Delete failed.");
        return;
      }
      const deleted = data.deletedCount ?? selectedCount;
      setRates((previous) => previous.filter((rate) => !selectedSet.has(rate.id)));
      clearSelection();
      setToast(`${deleted} rates deleted successfully`);
    } catch {
      setToast("Delete failed.");
    }
  };

  return (
    <AppLayout>
      <main className={`min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 ${selectedCount > 0 ? "pb-24" : ""}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Rate Master</h1>
              <p className="mt-1 text-sm text-slate-500">Maintain customer and general freight rates by route (saved in database).</p>
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
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-orange-500"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                        }}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all rates on this page"
                        disabled={!visibleIds.length}
                      />
                    </th>
                    {["Rate ID", "Customer", "Route", "Type", "Rate", "Min Freight", "Effective Date", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center text-sm text-slate-500">Loading rates…</td>
                    </tr>
                  ) : visible.length ? visible.map((rate) => (
                    <tr key={rate.id} className={`hover:bg-orange-50/30 ${selectedSet.has(rate.id) ? "bg-orange-50/50" : ""}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-orange-500"
                          checked={selectedSet.has(rate.id)}
                          onChange={() => toggleSelectRate(rate.id)}
                          aria-label={`Select rate ${stationLabel(rate)}`}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm font-bold font-mono" style={{ color: NAVY }} title={rate.id}>{rateIdLabel(rate)}</td>
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
                      <td colSpan={10} className="px-5 py-20 text-center">
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

      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              {selectedCount} rate{selectedCount === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={requestBulkDelete}
                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && selectedCount > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBulkDeleteOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-rates-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card-lg"
          >
            <h2 id="bulk-delete-rates-title" className="text-lg font-bold" style={{ color: NAVY }}>
              Delete {selectedCount} rate{selectedCount === 1 ? "" : "s"}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">This permanently removes the selected rates. This cannot be undone.</p>
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {bulkDeleteRates.map((rate) => (
                <li key={rate.id} className="font-medium">{stationLabel(rate)}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
              <strong>{stationLabel(deleteTarget)}</strong>
              ? This cannot be undone.
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
