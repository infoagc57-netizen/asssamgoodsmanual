"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function currentMonthValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function formatMonthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatRowDate(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

const emptyForm = () => ({
  lrNumber: "",
  amount: "",
  date: toDateInputValue(new Date()),
  vendorName: "",
  vendorMobile: "",
  vehicleNumber: "",
  notes: "",
  consignee: "",
  route: "",
  bookingId: "",
});

function LocalCartagePage() {
  const [month, setMonth] = useState(currentMonthValue);
  const [entries, setEntries] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [lrLookup, setLrLookup] = useState({ loading: false, error: "" });

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cartage?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load cartage");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setMonthlyTotal(Number(data.monthlyTotal || 0));
    } catch (err) {
      setEntries([]);
      setMonthlyTotal(0);
      setError(err.message || "Failed to load cartage");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const lookupLr = useCallback(async (lrNumber) => {
    const key = String(lrNumber || "").trim();
    if (!key) {
      setForm((prev) => ({ ...prev, consignee: "", route: "", bookingId: "" }));
      setLrLookup({ loading: false, error: "" });
      return;
    }
    setLrLookup({ loading: true, error: "" });
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(key)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setForm((prev) => ({ ...prev, consignee: "", route: "", bookingId: "" }));
        setLrLookup({ loading: false, error: data.error || "LR not found" });
        return;
      }
      const booking = data.booking;
      const consignee = booking?.consignee?.name || "";
      const route = booking?.route
        ? [booking.route.bookingBranch, booking.route.deliveryBranch].filter(Boolean).join(" → ")
        : "";
      setForm((prev) => ({
        ...prev,
        consignee,
        route,
        bookingId: booking?.id || booking?.lrNumber || "",
      }));
      setLrLookup({ loading: false, error: "" });
    } catch {
      setLrLookup({ loading: false, error: "Could not look up LR" });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.lrNumber.trim()) lookupLr(form.lrNumber);
    }, 400);
    return () => clearTimeout(timer);
  }, [form.lrNumber, lookupLr]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setLrLookup({ loading: false, error: "" });
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      lrNumber: entry.lrNumber || "",
      amount: String(entry.amount ?? ""),
      date: toDateInputValue(entry.date),
      vendorName: entry.vendorName || "",
      vendorMobile: entry.vendorMobile || "",
      vehicleNumber: entry.vehicleNumber || "",
      notes: entry.notes || "",
      consignee: entry.consignee || "",
      route: entry.route || "",
      bookingId: entry.bookingId || "",
    });
    setLrLookup({ loading: false, error: "" });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        lrNumber: form.lrNumber.trim(),
        amount: Number(form.amount),
        date: form.date,
        vendorName: form.vendorName,
        vendorMobile: form.vendorMobile,
        vehicleNumber: form.vehicleNumber,
        notes: form.notes,
      };
      const url = editingId ? `/api/cartage/${encodeURIComponent(editingId)}` : "/api/cartage";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      resetForm();
      await loadEntries();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete cartage for LR ${entry.lrNumber}?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/cartage/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (editingId === entry.id) resetForm();
      await loadEntries();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const exportExcel = () => {
    const sheetRows = entries.map((row, index) => ({
      SR: index + 1,
      Date: formatRowDate(row.date),
      "LR No": row.lrNumber,
      Consignee: row.consignee || "",
      Route: row.route || "",
      Amount: Number(row.amount || 0),
      "Vendor / Driver": row.vendorName || "",
      Mobile: row.vendorMobile || "",
      Vehicle: row.vehicleNumber || "",
      Notes: row.notes || "",
    }));
    sheetRows.push({
      SR: "",
      Date: "",
      "LR No": "",
      Consignee: "",
      Route: "TOTAL",
      Amount: monthlyTotal,
      "Vendor / Driver": "",
      Mobile: "",
      Vehicle: "",
      Notes: "",
    });
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Local Cartage");
    XLSX.writeFile(wb, `local-cartage-${month}.xlsx`);
  };

  const monthLabel = useMemo(() => formatMonthLabel(month), [month]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Local Cartage</h1>
            <p className="mt-1 text-sm text-slate-500">Month-wise ledger of local cartage charges per LR.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-slate-600">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`${inputClass} mt-1 w-[180px]`}
              />
            </label>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!entries.length}
              className="inline-flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Period</p>
            <p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{monthLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Entries</p>
            <p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{entries.length}</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-800/80">Monthly total</p>
            <p className="mt-2 text-2xl font-bold text-orange-900">{money(monthlyTotal)}</p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-600">
              {editingId ? "Edit cartage entry" : "Add cartage entry"}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-500 hover:text-orange-600">
                Cancel edit
              </button>
            )}
          </div>
          <form onSubmit={submitForm} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">
              LR Number
              <input
                required
                value={form.lrNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, lrNumber: e.target.value }))}
                className={`${inputClass} mt-1`}
                placeholder="e.g. 07900000001"
              />
              {lrLookup.loading && <span className="mt-1 block text-xs text-slate-500">Looking up LR…</span>}
              {lrLookup.error && <span className="mt-1 block text-xs text-amber-700">{lrLookup.error}</span>}
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Amount (₹)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Vendor / Driver
              <input
                value={form.vendorName}
                onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))}
                className={`${inputClass} mt-1`}
                placeholder="Name"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mobile
              <input
                value={form.vendorMobile}
                onChange={(e) => setForm((prev) => ({ ...prev, vendorMobile: e.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Vehicle number
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-3">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white"
              />
            </label>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2 lg:col-span-2">
              <p><span className="font-semibold text-slate-700">Consignee:</span> {form.consignee || "—"}</p>
              <p className="mt-1"><span className="font-semibold text-slate-700">Route:</span> {form.route || "—"}</p>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[42px] w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ORANGE }}
              >
                {saving ? "Saving…" : editingId ? "Update entry" : "Add entry"}
              </button>
            </div>
          </form>
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Date", "LR No", "Consignee", "Route", "Amount", "Vendor / Driver", "Notes", "Actions"].map((heading) => (
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
                    <td colSpan={8} className="px-5 py-16 text-center text-sm text-slate-500">Loading entries…</td>
                  </tr>
                ) : entries.length ? (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-orange-50/30">
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{formatRowDate(entry.date)}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/bookings/${encodeURIComponent(entry.lrNumber)}`}
                          className="text-sm font-bold hover:text-orange-600"
                          style={{ color: NAVY }}
                        >
                          {entry.lrNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{entry.consignee || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{entry.route || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">{money(entry.amount)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        <div>{entry.vendorName || "—"}</div>
                        {entry.vendorMobile && <div className="text-xs text-slate-500">{entry.vendorMobile}</div>}
                        {entry.vehicleNumber && <div className="text-xs text-slate-500">{entry.vehicleNumber}</div>}
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-4 text-sm text-slate-600" title={entry.notes || ""}>
                        {entry.notes || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                        <button type="button" onClick={() => startEdit(entry)} className="mr-3 text-[#0B1F33] hover:text-orange-600">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteEntry(entry)} className="text-red-600 hover:text-red-700">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-sm font-semibold" style={{ color: NAVY }}>
                      No cartage entries for {monthLabel}.
                    </td>
                  </tr>
                )}
              </tbody>
              {entries.length > 0 && (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-5 py-3 text-right text-sm font-bold text-slate-600">Monthly total</td>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{money(monthlyTotal)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LocalCartagePageWithLayout() {
  return (
    <AppLayout>
      <LocalCartagePage />
    </AppLayout>
  );
}
