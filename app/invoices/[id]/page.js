"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const invoices = JSON.parse(window.localStorage.getItem("agc_invoices") || "[]");
      const id = decodeURIComponent(params?.id || "");
      setInvoice(invoices.find((item) => item.invoiceNumber === id || item.id === id) || null);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Invoice not found</h1>
            <a href="/invoices" className="mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Invoices</a>
          </div>
        </main>
      </AppLayout>
    );
  }

  const lines = invoice.lines || [];

  return (
    <AppLayout>
      <main className="invoice-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <a href="/invoices" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoices / Details</a>
              <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{invoice.invoiceNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">{invoice.customerName} · {invoice.status || "Generated"} · {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString("en-IN") : ""}</p>
            </div>
            <div className="flex gap-2">
              <a href="/invoices" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</a>
              <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Print GST Invoice</button>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[["Customer", invoice.customerName], ["GST", invoice.customerGst], ["Payment Type", String(invoice.paymentType || "").toUpperCase()], ["LRs", (invoice.lrNumbers || []).join(", ")]].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "-"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["LR", "Date", "From", "To", "Freight", "GST", "Total"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.lrNumber}>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{line.lrNumber}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{line.date || "-"}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{line.from || "-"}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{line.to || "-"}</td>
                    <td className="px-5 py-3 text-sm">{money(line.freight)}</td>
                    <td className="px-5 py-3 text-sm">{money(line.gst)}</td>
                    <td className="px-5 py-3 text-sm font-semibold">{money(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-3">
              {[["Freight", invoice.freight], ["GST", invoice.gst], ["Grand Total", invoice.grandTotal]].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color: NAVY }}>{money(value)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <section className="gst-invoice" aria-label="GST Invoice">
        <div className="sheet">
          <header>
            <div className="brand">
              <img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" style={{ height: "16mm", width: "auto" }} />
              <div>
                <strong>ASSAM GOODS CARRIER</strong>
                <span>SAFE • RELIABLE • ON TIME · GST INVOICE</span>
              </div>
            </div>
            <div className="meta">
              <b>Invoice No.</b> {invoice.invoiceNumber}<br />
              <b>Date</b> {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : "-"}<br />
              <b>Type</b> {String(invoice.paymentType || "TBB").toUpperCase()}
            </div>
          </header>
          <div className="party">
            <h3>Bill To</h3>
            <p><b>{invoice.customerName || "-"}</b></p>
            <p>GSTIN: {invoice.customerGst || "-"}</p>
            <p>Mobile: {invoice.customerMobile || "-"}</p>
            <p>{invoice.customerAddress || "-"}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>LR Number</th>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Freight</th>
                <th>GST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.lrNumber}>
                  <td>{line.lrNumber}</td>
                  <td>{line.date || "-"}</td>
                  <td>{line.from || "-"}</td>
                  <td>{line.to || "-"}</td>
                  <td>{money(line.freight)}</td>
                  <td>{money(line.gst)}</td>
                  <td>{money(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <div><span>Freight</span><b>{money(invoice.freight)}</b></div>
            <div><span>GST</span><b>{money(invoice.gst)}</b></div>
            <div className="grand"><span>Grand Total</span><b>{money(invoice.grandTotal)}</b></div>
          </div>
          <footer>Assam Goods Carrier · Subject to company rules · Computer generated GST invoice</footer>
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `
        .gst-invoice { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden; }
          .gst-invoice, .gst-invoice * { visibility: visible; }
          .gst-invoice { display: block !important; position: absolute; left: 0; top: 0; width: 100%; color: #0B1F33; font-family: Arial, Helvetica, sans-serif; }
          .gst-invoice .sheet { border: 1px solid #0B1F33; padding: 8mm; }
          .gst-invoice header { display: flex !important; justify-content: space-between; gap: 8mm; border-bottom: 2px solid #0B1F33; padding-bottom: 4mm; }
          .gst-invoice .brand { display: flex; gap: 3mm; align-items: center; }
          .gst-invoice .logo { width: 14mm; height: 14mm; display: flex; align-items: center; justify-content: center; background: #F97316; color: #fff; font-weight: 700; }
          .gst-invoice strong { display: block; font-size: 16pt; letter-spacing: 0.8mm; }
          .gst-invoice header span { display: block; color: #F97316; font-size: 8pt; letter-spacing: 0.6mm; }
          .gst-invoice .meta { font-size: 9pt; text-align: right; }
          .gst-invoice .party { margin: 5mm 0; padding: 3mm; border: 1px solid #0B1F33; }
          .gst-invoice .party h3 { margin: 0 0 2mm; font-size: 8pt; letter-spacing: 0.8mm; }
          .gst-invoice .party p { margin: 1mm 0; font-size: 10pt; }
          .gst-invoice table { width: 100%; border-collapse: collapse; }
          .gst-invoice th, .gst-invoice td { border: 1px solid #0B1F33; padding: 2mm; font-size: 9pt; text-align: left; }
          .gst-invoice th { background: #0B1F33; color: #fff; font-size: 8pt; letter-spacing: 0.4mm; }
          .gst-invoice .totals { margin-top: 4mm; margin-left: auto; width: 70mm; }
          .gst-invoice .totals div { display: flex; justify-content: space-between; padding: 1.5mm 0; border-bottom: 1px solid #cbd5e1; font-size: 10pt; }
          .gst-invoice .grand { font-size: 12pt; }
          .gst-invoice footer { margin-top: 8mm; border-top: 1px solid #cbd5e1; padding-top: 2mm; text-align: center; font-size: 8pt; color: #64748b; }
        }
      ` }} />
    </AppLayout>
  );
}
