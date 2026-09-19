"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const emptySummary = {
  totalBookings: 0,
  totalBoxes: 0,
  totalWeight: 0,
  totalAmount: 0,
  toPayAmount: 0,
  paidAmount: 0,
  tbbAmount: 0,
  codAmount: 0,
};

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(currentMonthValue);
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filterOptions, setFilterOptions] = useState({ branches: [], statuses: [], deliveryTypes: ["door", "godown"] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ month });
      if (branch) params.set("branch", branch);
      if (status) params.set("status", status);
      if (deliveryType) params.set("deliveryType", deliveryType);
      const res = await fetch(`/api/reports/monthly?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary({ ...emptySummary, ...(data.summary || {}) });
      setFilterOptions(data.filterOptions || { branches: [], statuses: [], deliveryTypes: ["door", "godown"] });
    } catch (err) {
      setRows([]);
      setSummary(emptySummary);
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, branch, status, deliveryType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summaryCards = useMemo(() => [
    { label: "Total bookings", value: summary.totalBookings },
    { label: "Total boxes", value: summary.totalBoxes },
    { label: "Total weight", value: `${Number(summary.totalWeight || 0).toFixed(2)} kg` },
    { label: "Total amount", value: money(summary.totalAmount) },
  ], [summary]);

  const exportExcel = () => {
    const sheetRows = rows.map((row) => ({
      SR: row.sr,
      "LR No": row.lrNumber,
      Date: formatRowDate(row.date),
      Consignor: row.consignor,
      Consignee: row.consignee,
      City: row.city,
      From: row.fromBranch,
      To: row.toBranch,
      Packages: row.packages,
      "Weight (kg)": Number(row.weight || 0).toFixed(2),
      Amount: Number(row.amount || 0).toFixed(2),
      Payment: row.paymentType,
      Status: row.status,
      "Delivery Type": row.deliveryType,
    }));

    sheetRows.push({
      SR: "",
      "LR No": "TOTALS",
      Date: "",
      Consignor: "",
      Consignee: "",
      City: "",
      From: "",
      To: "",
      Packages: summary.totalBoxes,
      "Weight (kg)": Number(summary.totalWeight || 0).toFixed(2),
      Amount: Number(summary.totalAmount || 0).toFixed(2),
      Payment: "",
      Status: "",
      "Delivery Type": "",
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Shipments");
    XLSX.writeFile(workbook, `AGC-Monthly-Report-${month}.xlsx`);
  };

  return (
    <AppLayout>
      <main className="monthly-report-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="monthly-report-root mx-auto max-w-7xl">
          <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Reports</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Monthly Shipment Report</h1>
              <p className="mt-1 text-sm text-slate-500">Shipments by month for transporter billing and claims.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportExcel}
                disabled={!rows.length}
                className="inline-flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 disabled:opacity-50"
              >
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  document.documentElement.classList.add("printing-monthly-report");
                  window.print();
                  window.addEventListener(
                    "afterprint",
                    () => document.documentElement.classList.remove("printing-monthly-report"),
                    { once: true },
                  );
                }}
                className="inline-flex h-[42px] items-center rounded-xl px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: ORANGE }}
              >
                Print
              </button>
            </div>
          </div>

          <section className="no-print mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-700">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Branch (from)
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={`${inputClass} mt-1.5`}>
                  <option value="">All branches</option>
                  {filterOptions.branches.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1.5`}>
                  <option value="">All statuses</option>
                  {filterOptions.statuses.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Delivery type
                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className={`${inputClass} mt-1.5`}>
                  <option value="">All types</option>
                  {filterOptions.deliveryTypes.map((name) => (
                    <option key={name} value={name}>{name === "godown" ? "Godown" : "Door"}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{card.value}</p>
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 print:border-slate-300">
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>
                {formatMonthLabel(month)}
              </h2>
              <p className="text-sm text-slate-600">
                {summary.totalBookings} shipment{summary.totalBookings === 1 ? "" : "s"}
                {branch ? ` · Branch: ${branch}` : ""}
                {status ? ` · Status: ${status}` : ""}
                {deliveryType ? ` · Delivery: ${deliveryType}` : ""}
              </p>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 print:bg-white">
                  <tr>
                    {["SR", "LR No", "Date", "Consignor", "Consignee", "City", "From", "To", "Pkgs", "Weight", "Amount", "Payment", "Status", "Delivery"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap border-b border-slate-100 px-3 py-2 print:border-slate-300">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="px-5 py-16 text-center text-slate-500">Loading report…</td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.lrNumber}>
                        <td className="px-3 py-2">{row.sr}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: NAVY }}>{row.lrNumber}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatRowDate(row.date)}</td>
                        <td className="px-3 py-2">{row.consignor || "—"}</td>
                        <td className="px-3 py-2">{row.consignee || "—"}</td>
                        <td className="px-3 py-2">{row.city || "—"}</td>
                        <td className="px-3 py-2">{row.fromBranch || "—"}</td>
                        <td className="px-3 py-2">{row.toBranch || "—"}</td>
                        <td className="px-3 py-2 text-right">{row.packages}</td>
                        <td className="px-3 py-2 text-right">{Number(row.weight || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{money(row.amount)}</td>
                        <td className="px-3 py-2">{row.paymentType || "—"}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2 capitalize">{row.deliveryType || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="px-5 py-20 text-center text-slate-500">
                        No shipments found for {formatMonthLabel(month)} with the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold print:bg-white">
                      <td className="px-3 py-3" colSpan={8}>Totals</td>
                      <td className="px-3 py-3 text-right">{summary.totalBoxes}</td>
                      <td className="px-3 py-3 text-right">{Number(summary.totalWeight || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">{money(summary.totalAmount)}</td>
                      <td className="px-3 py-3" colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
