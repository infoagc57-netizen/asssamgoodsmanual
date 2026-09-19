"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const normalize = (value) => String(value || "").trim().toLowerCase();

const customerKey = (booking) => normalize(booking.billedCustomerName || booking.consignor?.name || booking.consignee?.name);

export default function NewInvoicePage() {
  const [bookings, setBookings] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("tbb");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const loadEligible = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/eligible?paymentType=${encodeURIComponent(paymentFilter)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setSelected([]);
    } catch (err) {
      setBookings([]);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [paymentFilter]);

  useEffect(() => {
    loadEligible();
  }, [loadEligible]);

  const selectedBookings = bookings.filter((booking) => selected.includes(booking.lrNumber));
  const lockedCustomer = selectedBookings[0] ? customerKey(selectedBookings[0]) : "";

  const toggle = (booking) => {
    setError("");
    const key = customerKey(booking);
    if (selected.includes(booking.lrNumber)) {
      setSelected((previous) => previous.filter((lr) => lr !== booking.lrNumber));
      return;
    }
    if (lockedCustomer && key !== lockedCustomer) {
      setError("Select LRs of the same billed customer only.");
      return;
    }
    setSelected((previous) => [...previous, booking.lrNumber]);
  };

  const party = selectedBookings[0];
  const customerName = party?.billedCustomerName || "";
  const customerGst = party?.billedCustomerGst || "";

  const totals = useMemo(() => {
    const sub = selectedBookings.reduce((t, b) => {
      const gst = Number(b.charges?.gstOnFreight || 0);
      const grand = Number(b.grandTotal || 0);
      return t + (grand > gst ? grand - gst : grand);
    }, 0);
    const gst = selectedBookings.reduce((t, b) => t + Number(b.charges?.gstOnFreight || 0), 0);
    const grand = selectedBookings.reduce((t, b) => t + Number(b.grandTotal || 0), 0);
    return { sub, gst, grand };
  }, [selectedBookings]);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedBookings.length) {
      setError("Select at least one LR.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lrNumbers: selected,
          paymentType: paymentFilter,
          invoiceDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");
      window.location.href = `/invoices/${encodeURIComponent(data.invoice.invoiceNumber)}`;
    } catch (err) {
      setError(err.message || "Failed to create invoice");
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Link href="/invoices" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoices / New</Link>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Invoice</h1>
            <p className="mt-1 text-sm text-slate-500">Bill delivered LRs with POD. Series: INV/FY/0001 with CGST/SGST or IGST.</p>
          </div>

          <form onSubmit={save} className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">
                  Payment type
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className={`${inputClass} mt-1.5`}
                  >
                    <option value="tbb">TBB (bill consignor)</option>
                    <option value="to_pay">To Pay (bill consignee)</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Invoice date
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={`${inputClass} mt-1.5`} required />
                </label>
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
                  Customer
                  <input readOnly value={customerName} placeholder="Select an LR" className={`${inputClass} mt-1.5 bg-slate-100`} />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  GSTIN
                  <input readOnly value={customerGst} className={`${inputClass} mt-1.5 bg-slate-100`} />
                </label>
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  Notes (on invoice)
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} mt-1.5`} />
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[["Taxable", money(totals.sub)], ["GST", money(totals.gst)], ["Grand total", money(totals.grand)]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-bold" style={{ color: NAVY }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Eligible bookings</h2>
                <p className="mt-1 text-xs text-slate-500">Delivered with POD, not yet invoiced (from MongoDB).</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Select", "LR", "Customer", "From", "To", "Taxable", "GST", "Total"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-500">Loading eligible LRs…</td>
                      </tr>
                    ) : bookings.length ? bookings.map((booking) => {
                      const name = booking.billedCustomerName || "-";
                      const gstAmt = Number(booking.charges?.gstOnFreight || 0);
                      const grand = Number(booking.grandTotal || 0);
                      const taxable = grand > gstAmt ? grand - gstAmt : grand;
                      const lockedOut = Boolean(lockedCustomer) && customerKey(booking) !== lockedCustomer && !selected.includes(booking.lrNumber);
                      return (
                        <tr key={booking.lrNumber} className={lockedOut ? "opacity-40" : "hover:bg-orange-50/30"}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selected.includes(booking.lrNumber)} disabled={lockedOut} onChange={() => toggle(booking)} />
                          </td>
                          <td className="px-4 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{booking.route?.bookingBranch || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{booking.route?.deliveryBranch || "-"}</td>
                          <td className="px-4 py-3 text-sm">{money(taxable)}</td>
                          <td className="px-4 py-3 text-sm">{money(gstAmt)}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{money(grand)}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-500">
                          No billing-ready {paymentFilter === "tbb" ? "TBB" : "To Pay"} LRs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Link href="/invoices" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
              <button type="submit" disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: ORANGE }}>
                {saving ? "Generating…" : "Generate invoice"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
