"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const INVOICE_KEY = "agc_invoices";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      setInvoices(JSON.parse(window.localStorage.getItem(INVOICE_KEY) || "[]"));
    } catch {
      setInvoices([]);
    }
  }, []);

  const visible = invoices.filter((invoice) => {
    const query = search.toLowerCase();
    if (!query) return true;
    return String(invoice.invoiceNumber || "").toLowerCase().includes(query)
      || String(invoice.customerName || "").toLowerCase().includes(query)
      || (invoice.lrNumbers || []).some((lr) => String(lr).toLowerCase().includes(query));
  });

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Finance</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Invoices</h1>
              <p className="mt-1 text-sm text-slate-500">Bill TBB (and To Pay) LRs that are delivered with POD.</p>
            </div>
            <a href="/invoices/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Create Invoice</a>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer or LR" className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Invoice", "Date", "Customer", "LRs", "Grand Total", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length ? visible.map((invoice) => (
                    <tr key={invoice.invoiceNumber} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{invoice.invoiceNumber}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{invoice.customerName}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{(invoice.lrNumbers || []).join(", ")}</td>
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{money(invoice.grandTotal)}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{invoice.status || "Generated"}</span></td>
                      <td className="px-5 py-4 text-xs font-bold">
                        <a href={`/invoices/${encodeURIComponent(invoice.invoiceNumber)}`} className="text-orange-600 hover:text-orange-700">View / Print</a>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No invoices yet.</div>
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
