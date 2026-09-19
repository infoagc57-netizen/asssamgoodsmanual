"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function paymentBadge(status) {
  const value = status || "Unpaid";
  const colors = {
    Paid: "bg-green-50 text-green-700",
    Partial: "bg-amber-50 text-amber-800",
    Unpaid: "bg-slate-100 text-slate-700",
  };
  return colors[value] || colors.Unpaid;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (status) params.set("status", status);
      if (month) params.set("month", month);
      const res = await fetch(`/api/invoices?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setInvoices(res.ok && Array.isArray(data.invoices) ? data.invoices : []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus, status, month]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Finance</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Invoices</h1>
              <p className="mt-1 text-sm text-slate-500">GST tax invoices from delivered MongoDB bookings with POD.</p>
            </div>
            <Link
              href="/invoices/new"
              className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              + Create Invoice
            </Link>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, customer, GSTIN, LR"
              className={inputClass}
            />
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass}>
              <option value="">All payment status</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="">All invoice status</option>
              <option value="Issued">Issued</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Draft">Draft</option>
            </select>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Invoice", "Date", "Customer", "LRs", "Tax", "Grand Total", "Payment", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center text-sm text-slate-500">Loading invoices…</td>
                    </tr>
                  ) : invoices.length ? (
                    invoices.map((invoice) => (
                      <tr key={invoice.id || invoice.invoiceNumber} className="hover:bg-orange-50/30">
                        <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{invoice.invoiceNumber}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDate(invoice.invoiceDate || invoice.createdAt)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">{invoice.customerName}</td>
                        <td className="max-w-[140px] truncate px-5 py-4 text-sm text-slate-600" title={(invoice.lrNumbers || []).join(", ")}>
                          {(invoice.lrNumbers || []).join(", ")}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">
                          {invoice.taxType === "inter" ? "IGST" : "CGST+SGST"}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{money(invoice.grandTotal)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentBadge(invoice.paymentStatus)}`}>
                            {invoice.paymentStatus || "Unpaid"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{invoice.status || "Issued"}</td>
                        <td className="px-5 py-4 text-xs font-bold">
                          <Link
                            href={`/invoices/${encodeURIComponent(invoice.invoiceNumber)}`}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            View / Print
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No invoices found.</div>
                        <p className="mt-1 text-xs text-slate-500">Create an invoice from billing-ready LRs.</p>
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
