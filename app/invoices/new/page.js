"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const BOOKING_KEY = "agc_bookings";
const CUSTOMER_KEY = "agc_customers";
const INVOICE_KEY = "agc_invoices";
const NEXT_KEY = "agc_next_invoice";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const readList = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const paymentKind = (booking) => {
  const value = normalize(booking?.paymentType).replace(/\s+/g, "_");
  if (value === "paid") return "paid";
  if (value === "tbb") return "tbb";
  return "to_pay";
};

const hasPod = (booking) => Boolean(booking?.pod) || (booking?.trackingHistory || []).some((entry) => entry.event === "POD Received");

const isBillingReady = (booking) => booking?.billingReady === true || (booking?.status === "Delivered" && hasPod(booking));

const isInvoiced = (booking) => Boolean(booking?.invoiceId || booking?.invoiceNumber || booking?.invoiceStatus === "Generated");

const partyOf = (booking) => {
  if (paymentKind(booking) === "to_pay") {
    return {
      name: booking.consignee?.name || "Consignee",
      gst: booking.consignee?.gst || "",
      mobile: booking.consignee?.mobile || "",
      address: booking.consignee?.address || "",
    };
  }
  return {
    name: booking.consignor?.name || "Consignor",
    gst: booking.consignor?.gst || "",
    mobile: booking.consignor?.mobile || "",
    address: booking.consignor?.address || "",
  };
};

const customerKey = (booking) => normalize(partyOf(booking).name);

const lineOf = (booking) => ({
  lrNumber: booking.lrNumber,
  date: booking.date || String(booking.createdAt || "").slice(0, 10),
  from: booking.route?.bookingBranch || "",
  to: booking.route?.deliveryBranch || booking.route?.deliveryAt || "",
  freight: Number(booking.charges?.freight || 0),
  gst: Number(booking.charges?.gstOnFreight || 0),
  total: Number(booking.grandTotal || 0),
});

const takeNextInvoiceNumber = (invoices) => {
  const highest = invoices.reduce((max, invoice) => Math.max(max, Number(String(invoice.invoiceNumber || "").replace(/\D/g, "")) || 0), 0);
  const stored = Number(window.localStorage.getItem(NEXT_KEY) || 0);
  const next = Math.max(highest + 1, stored || 1);
  window.localStorage.setItem(NEXT_KEY, String(next + 1));
  return `INV${String(next).padStart(6, "0")}`;
};

export default function NewInvoicePage() {
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("tbb");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setBookings(readList(BOOKING_KEY));
    setCustomers(readList(CUSTOMER_KEY));
  }, []);

  const eligible = useMemo(() => bookings.filter((booking) => (
    isBillingReady(booking)
    && !isInvoiced(booking)
    && paymentKind(booking) === paymentFilter
  )), [bookings, paymentFilter]);

  const selectedBookings = eligible.filter((booking) => selected.includes(booking.lrNumber));
  const lockedCustomer = selectedBookings[0] ? customerKey(selectedBookings[0]) : "";

  const toggle = (booking) => {
    setError("");
    const key = customerKey(booking);
    if (selected.includes(booking.lrNumber)) {
      setSelected((previous) => previous.filter((lr) => lr !== booking.lrNumber));
      return;
    }
    if (lockedCustomer && key !== lockedCustomer) {
      setError("Select LRs of the same customer only.");
      return;
    }
    setSelected((previous) => [...previous, booking.lrNumber]);
  };

  const party = selectedBookings[0] ? partyOf(selectedBookings[0]) : null;
  const master = party ? customers.find((item) => normalize(item.name) === normalize(party.name)) : null;
  const customerName = party?.name || "";
  const customerGst = master?.gst || party?.gst || "";
  const customerMobile = master?.mobile || party?.mobile || "";
  const customerAddress = master?.address || party?.address || "";
  const freight = selectedBookings.reduce((total, booking) => total + Number(booking.charges?.freight || 0), 0);
  const gst = selectedBookings.reduce((total, booking) => total + Number(booking.charges?.gstOnFreight || 0), 0);
  const grandTotal = selectedBookings.reduce((total, booking) => total + Number(booking.grandTotal || 0), 0);

  const save = (event) => {
    event.preventDefault();
    setError("");
    if (!selectedBookings.length) {
      setError("Select at least one LR.");
      return;
    }
    const keys = new Set(selectedBookings.map(customerKey));
    if (keys.size > 1) {
      setError("Select LRs of the same customer only.");
      return;
    }

    const latestBookings = readList(BOOKING_KEY);
    const blocked = selectedBookings.filter((booking) => {
      const current = latestBookings.find((item) => item.lrNumber === booking.lrNumber);
      return !current || !isBillingReady(current) || isInvoiced(current);
    });
    if (blocked.length) {
      setError(`Already invoiced or not billing-ready: ${blocked.map((item) => item.lrNumber).join(", ")}`);
      return;
    }

    const invoices = readList(INVOICE_KEY);
    const createdAt = new Date().toISOString();
    const invoiceNumber = takeNextInvoiceNumber(invoices);
    const lines = selectedBookings.map(lineOf);
    const invoice = {
      id: invoiceNumber,
      invoiceNumber,
      customerId: master?.id || `PARTY:${normalize(customerName)}`,
      customerName,
      customerGst,
      customerMobile,
      customerAddress,
      paymentType: paymentFilter,
      lrNumbers: selectedBookings.map((booking) => booking.lrNumber),
      lines,
      freight: Number(freight.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      status: "Generated",
      createdAt,
    };

    window.localStorage.setItem(INVOICE_KEY, JSON.stringify([...invoices, invoice]));
    window.localStorage.setItem(BOOKING_KEY, JSON.stringify(latestBookings.map((booking) => (
      selected.includes(booking.lrNumber)
        ? {
            ...booking,
            createdAt: booking.createdAt,
            invoiceId: invoiceNumber,
            invoiceNumber,
            invoiceStatus: "Generated",
          }
        : booking
    ))));
    window.location.href = `/invoices/${encodeURIComponent(invoiceNumber)}`;
  };

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <a href="/invoices" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoices / New</a>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Invoice</h1>
            <p className="mt-1 text-sm text-slate-500">Bill one LR or multiple LRs for the same customer. TBB is the default bill-to party.</p>
          </div>

          <form onSubmit={save} className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Payment Type
                  <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setSelected([]); setError(""); }} className={`${inputClass} mt-1.5`}>
                    <option value="tbb">TBB</option>
                    <option value="to_pay">To Pay</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Customer
                  <input readOnly value={customerName} placeholder="Select an LR to auto-fill" className={`${inputClass} mt-1.5 bg-slate-100`} />
                </label>
                <label className="text-xs font-semibold text-slate-700">GST
                  <input readOnly value={customerGst} className={`${inputClass} mt-1.5 bg-slate-100`} />
                </label>
                <label className="text-xs font-semibold text-slate-700">LR Numbers
                  <input readOnly value={selected.join(", ")} className={`${inputClass} mt-1.5 bg-slate-100`} />
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[["Freight", money(freight)], ["GST", money(gst)], ["Grand Total", money(grandTotal)]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-bold" style={{ color: NAVY }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Eligible Bookings</h2>
                <p className="mt-1 text-xs text-slate-500">billingReady LRs that are not already invoiced.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Select", "LR", "Customer", "From", "To", "Freight", "GST", "Total"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eligible.length ? eligible.map((booking) => {
                      const partyName = partyOf(booking).name;
                      const lockedOut = Boolean(lockedCustomer) && customerKey(booking) !== lockedCustomer && !selected.includes(booking.lrNumber);
                      return (
                        <tr key={booking.lrNumber} className={lockedOut ? "opacity-40" : "hover:bg-orange-50/30"}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selected.includes(booking.lrNumber)} disabled={lockedOut} onChange={() => toggle(booking)} />
                          </td>
                          <td className="px-4 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{partyName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{booking.route?.bookingBranch || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{booking.route?.deliveryBranch || "-"}</td>
                          <td className="px-4 py-3 text-sm">{money(booking.charges?.freight)}</td>
                          <td className="px-4 py-3 text-sm">{money(booking.charges?.gstOnFreight)}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{money(booking.grandTotal)}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-16 text-center text-sm text-slate-500">No billing-ready {paymentFilter === "tbb" ? "TBB" : "To Pay"} LRs available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <a href="/invoices" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</a>
              <button type="submit" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Generate Invoice</button>
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
