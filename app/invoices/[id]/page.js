"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InvoicePrintLayout from "@/components/invoices/InvoicePrintLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceKey = decodeURIComponent(params?.id || "");
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "Bank", ref: "", remarks: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceKey)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invoice not found");
      setInvoice(data.invoice);
    } catch (err) {
      setInvoice(null);
      setError(err.message || "Invoice not found");
    } finally {
      setLoading(false);
    }
  }, [invoiceKey]);

  useEffect(() => {
    load();
  }, [load]);

  const recordPayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceKey)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          mode: paymentForm.mode,
          ref: paymentForm.ref,
          remarks: paymentForm.remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setInvoice(data.invoice);
      setPaymentForm({ amount: "", mode: "Bank", ref: "", remarks: "" });
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setSavingPayment(false);
    }
  };

  const cancelInvoice = async () => {
    const reason = window.prompt("Reason for cancellation?");
    if (reason === null) return;
    setError("");
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled", cancelReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancel failed");
      setInvoice(data.invoice);
    } catch (err) {
      setError(err.message || "Cancel failed");
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading invoice…</div>;
  }

  if (!invoice) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>{error || "Invoice not found"}</h1>
            <Link href="/invoices" className="mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Invoices</Link>
          </div>
        </main>
      </AppLayout>
    );
  }

  const lines = invoice.lines || [];
  const isIntra = invoice.taxType === "intra";

  return (
    <AppLayout>
      <main className="invoice-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/invoices" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoices / Details</Link>
              <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{invoice.invoiceNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {invoice.customerName} · {invoice.status} · {invoice.paymentStatus} · {formatDate(invoice.invoiceDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/invoices" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</Link>
              {invoice.status === "Issued" && (
                <button type="button" onClick={cancelInvoice} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  Cancel invoice
                </button>
              )}
              <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>
                Print tax invoice
              </button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Place of supply", `${invoice.placeOfSupply} (${invoice.placeOfSupplyStateCode || "-"})`],
              ["Tax type", isIntra ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"],
              ["Paid", money(invoice.paidAmount)],
              ["Balance", money(invoice.balanceAmount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Bill to</p>
                <p className="mt-1 font-bold text-slate-900">{invoice.customerName}</p>
                <p className="text-sm text-slate-600">GSTIN: {invoice.customerGstin || "Unregistered"}</p>
                <p className="text-sm text-slate-600">{invoice.customerAddress}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">LR numbers</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(invoice.lrNumbers || []).map((lr) => (
                    <Link key={lr} href={`/bookings/${encodeURIComponent(lr)}`} className="text-sm font-bold text-orange-600 hover:underline">
                      {lr}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["LR", "HSN/SAC", "Taxable", "GST %", isIntra ? "CGST" : "IGST", isIntra ? "SGST" : null, "Total"].filter(Boolean).map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.lrNumber}>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{line.lrNumber}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{line.hsnSac}</td>
                    <td className="px-5 py-3 text-sm">{money(line.taxableValue)}</td>
                    <td className="px-5 py-3 text-sm">{line.gstRate}%</td>
                    {isIntra ? (
                      <>
                        <td className="px-5 py-3 text-sm">{money(line.cgst)}</td>
                        <td className="px-5 py-3 text-sm">{money(line.sgst)}</td>
                      </>
                    ) : (
                      <td className="px-5 py-3 text-sm">{money(line.igst)}</td>
                    )}
                    <td className="px-5 py-3 text-sm font-semibold">{money(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[["Subtotal", invoice.subTotal], isIntra ? ["CGST", invoice.cgstTotal] : ["IGST", invoice.igstTotal], isIntra ? ["SGST", invoice.sgstTotal] : null, ["Grand total", invoice.grandTotal]].filter(Boolean).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color: NAVY }}>{money(value)}</p>
                </div>
              ))}
            </div>
            <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700"><b>Amount in words:</b> {invoice.amountInWords}</p>
          </section>

          {invoice.status === "Issued" && invoice.paymentStatus !== "Paid" && (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-600">Record payment</h2>
              <form onSubmit={recordPayment} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input required type="number" min="0.01" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
                <select value={paymentForm.mode} onChange={(e) => setPaymentForm((p) => ({ ...p, mode: e.target.value }))} className={inputClass}>
                  {["Cash", "Bank", "UPI", "Cheque"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
                <input placeholder="Reference" value={paymentForm.ref} onChange={(e) => setPaymentForm((p) => ({ ...p, ref: e.target.value }))} className={inputClass} />
                <input placeholder="Remarks" value={paymentForm.remarks} onChange={(e) => setPaymentForm((p) => ({ ...p, remarks: e.target.value }))} className={inputClass} />
                <button type="submit" disabled={savingPayment} className="h-[42px] rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: ORANGE }}>
                  {savingPayment ? "Saving…" : "Add payment"}
                </button>
              </form>
            </section>
          )}

          {(invoice.payments || []).length > 0 && (
            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-700">Payment history</div>
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Date", "Amount", "Mode", "Reference", "Remarks"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-3 text-sm">{formatDate(p.date)}</td>
                      <td className="px-5 py-3 text-sm font-semibold">{money(p.amount)}</td>
                      <td className="px-5 py-3 text-sm">{p.mode}</td>
                      <td className="px-5 py-3 text-sm">{p.ref || "-"}</td>
                      <td className="px-5 py-3 text-sm">{p.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>

      <InvoicePrintLayout invoice={invoice} />
    </AppLayout>
  );
}
