"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InvoicePrintLayout from "@/components/invoices/InvoicePrintLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

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

function displayStatus(invoice) {
  if (invoice?.status === "Cancelled") return "Cancelled";
  return invoice?.paymentStatus || "Unpaid";
}

function statusBadgeClass(status) {
  const map = {
    Paid: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    Partial: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
    Unpaid: "bg-red-50 text-red-800 ring-1 ring-red-200",
    Cancelled: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return map[status] || map.Unpaid;
}

function InvoiceDetailSkeleton() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-9 w-72 max-w-full rounded-lg bg-slate-200" />
            <div className="mt-3 h-4 w-48 rounded bg-slate-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="mt-3 h-8 w-28 rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full max-w-md rounded bg-slate-100" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="h-4 w-full rounded bg-slate-200" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-slate-100 px-5 py-4">
                <div className="h-4 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceKey = decodeURIComponent(params?.id || "");
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "Bank", ref: "", remarks: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
      setPaymentModalOpen(false);
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setSavingPayment(false);
    }
  };

  const cancelInvoice = async () => {
    const reason = cancelReason.trim();
    if (!reason) return;
    setCancelling(true);
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
      setCancelModalOpen(false);
      setCancelReason("");
    } catch (err) {
      setError(err.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const openCancelModal = () => {
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const paymentRowsWithBalance = useMemo(() => {
    if (!invoice?.payments?.length) return [];
    const grand = Number(invoice.grandTotal) || 0;
    const sorted = [...invoice.payments].sort(
      (a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt),
    );
    let runningPaid = 0;
    return sorted.map((p, idx) => {
      runningPaid += Number(p.amount) || 0;
      return {
        ...p,
        key: idx,
        runningPaid,
        balanceAfter: Math.max(0, grand - runningPaid),
      };
    });
  }, [invoice]);

  if (loading) {
    return <InvoiceDetailSkeleton />;
  }

  if (!invoice) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
              aria-hidden
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="mt-5 text-xl font-bold text-slate-900">{error || "Invoice not found"}</h1>
            <p className="mt-2 text-sm text-slate-500">
              This invoice may have been removed or the link is incorrect.
            </p>
            <Link
              href="/invoices"
              className="mt-6 inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: NAVY }}
            >
              Back to Invoices
            </Link>
          </div>
        </main>
      </AppLayout>
    );
  }

  const lines = invoice.lines || [];
  const isIntra = invoice.taxType === "intra";
  const statusLabel = displayStatus(invoice);
  const balance = Number(invoice.balanceAmount) || 0;
  const canRecordPayment = invoice.status === "Issued" && invoice.paymentStatus !== "Paid";
  const placeLabel = [invoice.placeOfSupply, invoice.placeOfSupplyStateCode && `(${invoice.placeOfSupplyStateCode})`]
    .filter(Boolean)
    .join(" ");

  return (
    <AppLayout>
      <main className="invoice-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <nav>
            <Link
              href="/invoices"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-orange-600"
            >
              ← Invoices
            </Link>
          </nav>

          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Tax invoice</p>
                <h1 className="mt-1 break-all text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>
                  {invoice.invoiceNumber}
                </h1>
                <p className="mt-2 text-lg font-semibold text-slate-900">{invoice.customerName}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>
                    <span className="text-slate-400">Invoice date</span>{" "}
                    <span className="font-medium text-slate-800">{formatDate(invoice.invoiceDate)}</span>
                  </span>
                  <span className="hidden text-slate-300 sm:inline">|</span>
                  <span>
                    <span className="text-slate-400">Due date</span>{" "}
                    <span className="font-medium text-slate-800">{formatDate(invoice.dueDate)}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                <span
                  className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide sm:self-end ${statusBadgeClass(statusLabel)}`}
                >
                  {statusLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-[42px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    Print
                  </button>
                  {canRecordPayment && (
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(true)}
                      className="inline-flex h-[42px] items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Add Payment
                    </button>
                  )}
                  {invoice.status === "Issued" && (
                    <button
                      type="button"
                      onClick={openCancelModal}
                      className="inline-flex h-[42px] items-center justify-center rounded-xl border-2 border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Cancel Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Grand total</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{money(invoice.grandTotal)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Paid</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{money(invoice.paidAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Balance</p>
              <p className={`mt-2 text-2xl font-bold ${balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                {money(invoice.balanceAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Payment status</p>
              <p className="mt-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${statusBadgeClass(statusLabel)}`}>
                  {statusLabel}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {isIntra ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}
              </p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Bill to</p>
              <p className="mt-2 text-base font-bold text-slate-900">{invoice.customerName}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="w-20 shrink-0 font-medium text-slate-400">GSTIN</span>
                  <span className="text-slate-800">{invoice.customerGstin || "Unregistered"}</span>
                </li>
                {invoice.customerMobile && (
                  <li className="flex gap-2">
                    <span className="w-20 shrink-0 font-medium text-slate-400">Mobile</span>
                    <span className="text-slate-800">{invoice.customerMobile}</span>
                  </li>
                )}
                <li className="flex gap-2">
                  <span className="w-20 shrink-0 font-medium text-slate-400">Address</span>
                  <span className="text-slate-800">{invoice.customerAddress || "—"}</span>
                </li>
                <li className="flex gap-2 border-t border-slate-100 pt-3">
                  <span className="w-20 shrink-0 font-medium text-slate-400">Supply</span>
                  <span className="font-medium text-slate-800">{placeLabel || "—"}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Linked LRs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(invoice.lrNumbers || []).length === 0 && (
                  <span className="text-sm text-slate-400">No LRs</span>
                )}
                {(invoice.lrNumbers || []).map((lr) => (
                  <Link
                    key={lr}
                    href={`/bookings/${encodeURIComponent(lr)}`}
                    className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700 ring-1 ring-orange-100 hover:bg-orange-100"
                  >
                    {lr}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Line items</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      LR
                    </th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      HSN/SAC
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Taxable
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      GST %
                    </th>
                    {isIntra ? (
                      <>
                        <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                          CGST
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                          SGST
                        </th>
                      </>
                    ) : (
                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        IGST
                      </th>
                    )}
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, rowIdx) => (
                    <tr
                      key={line.lrNumber}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                    >
                      <td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{line.lrNumber}</td>
                      <td className="px-5 py-3 text-center text-sm font-mono text-slate-600">{line.hsnSac || "—"}</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-700">{money(line.taxableValue)}</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-700">{line.gstRate}%</td>
                      {isIntra ? (
                        <>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">{money(line.cgst)}</td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">{money(line.sgst)}</td>
                        </>
                      ) : (
                        <td className="px-5 py-3 text-right text-sm tabular-nums">{money(line.igst)}</td>
                      )}
                      <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                        {money(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={isIntra ? 6 : 5} className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Grand total
                    </td>
                    <td className="px-5 py-4 text-right text-lg font-bold tabular-nums" style={{ color: NAVY }}>
                      {money(invoice.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Subtotal", invoice.subTotal],
                isIntra ? ["CGST", invoice.cgstTotal] : ["IGST", invoice.igstTotal],
                isIntra ? ["SGST", invoice.sgstTotal] : null,
                ["Grand total", invoice.grandTotal],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: NAVY }}>{money(value)}</p>
                  </div>
                ))}
            </div>
            {invoice.amountInWords && (
              <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Amount in words:</span> {invoice.amountInWords}
              </p>
            )}
          </section>

          {paymentRowsWithBalance.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Payment history</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Date", "Amount", "Mode", "Reference", "Received by", "Balance"].map((h) => (
                        <th
                          key={h}
                          className={`px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 ${
                            h === "Amount" || h === "Balance" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentRowsWithBalance.map((p) => (
                      <tr key={p.key} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3 text-sm text-slate-700">{formatDate(p.date || p.createdAt)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-emerald-700">
                          {money(p.amount)}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-700">{p.mode}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{p.ref || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{p.receivedBy || "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-slate-800">
                          {money(p.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-700">Total paid</td>
                      <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-emerald-800">
                        {money(invoice.paidAmount)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {paymentModalOpen && canRecordPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !savingPayment && setPaymentModalOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id="payment-modal-title" className="text-lg font-bold" style={{ color: NAVY }}>
              Record payment
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Balance due: <span className="font-semibold text-slate-800">{money(invoice.balanceAmount)}</span>
            </p>
            <form onSubmit={recordPayment} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Amount</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mode</label>
                <select
                  value={paymentForm.mode}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, mode: e.target.value }))}
                  className={`${inputClass} mt-1`}
                >
                  {["Cash", "Bank", "UPI", "Cheque"].map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Reference</label>
                <input
                  placeholder="Txn / cheque no."
                  value={paymentForm.ref}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, ref: e.target.value }))}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Remarks</label>
                <input
                  placeholder="Optional"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, remarks: e.target.value }))}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => setPaymentModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingPayment ? "Saving…" : "Add payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelModalOpen && invoice.status === "Issued" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !cancelling && setCancelModalOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id="cancel-modal-title" className="text-lg font-bold text-red-700">Cancel invoice</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will mark <strong>{invoice.invoiceNumber}</strong> as cancelled. Please provide a reason.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
              Reason
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Keep invoice
              </button>
              <button
                type="button"
                disabled={cancelling || !cancelReason.trim()}
                onClick={cancelInvoice}
                className="rounded-lg border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoicePrintLayout invoice={invoice} />
    </AppLayout>
  );
}
