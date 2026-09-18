"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const readList = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const normalize = (value) => String(value || "").trim().toLowerCase();

export const paymentKind = (booking) => {
  const value = normalize(booking?.paymentType).replace(/\s+/g, "_");
  if (value === "paid") return "paid";
  if (value === "tbb") return "tbb";
  return "to_pay";
};

export const paymentLabel = (kind) => (kind === "paid" ? "Paid" : kind === "tbb" ? "TBB" : "To Pay");

export const partyNameOf = (booking) => {
  const kind = paymentKind(booking);
  if (kind === "to_pay") return String(booking?.consignee?.name || "").trim() || "Consignee";
  return String(booking?.consignor?.name || "").trim() || "Consignor";
};

export const hasPod = (booking) => Boolean(booking?.pod) || (booking?.trackingHistory || []).some((entry) => entry.event === "POD Received");

export const isBillingReady = (booking) => booking?.status === "Delivered" && hasPod(booking);

const findCustomer = (customers, name) => customers.find((item) => normalize(item.name) === normalize(name));

const customerIdFor = (customers, name) => findCustomer(customers, name)?.id || `PARTY:${normalize(name)}`;

const hireCost = (trip) => Number(trip?.hireAmount || trip?.vendorAmount || trip?.hireCharge || trip?.summary?.totalFreight || 0);

export const vendorPayableTotal = (trips = readList("agc_trips")) => trips
  .filter((trip) => trip.tripType === "Hire Vehicle" && !trip.vendorPaid)
  .reduce((total, trip) => total + hireCost(trip), 0);

const creditMapFromPayments = (payments) => {
  const allocated = {};
  const unallocated = {};
  payments.forEach((payment) => {
    const amount = Number(payment.amount || 0);
    if (Array.isArray(payment.allocations) && payment.allocations.length) {
      payment.allocations.forEach((item) => {
        const lr = item.lrNumber;
        if (!lr) return;
        allocated[lr] = (allocated[lr] || 0) + Number(item.amount || 0);
      });
      return;
    }
    if (payment.lrNumber) {
      allocated[payment.lrNumber] = (allocated[payment.lrNumber] || 0) + amount;
      return;
    }
    if (payment.customerId) unallocated[payment.customerId] = (unallocated[payment.customerId] || 0) + amount;
  });
  return { allocated, unallocated };
};

export function syncLedger() {
  const bookings = readList("agc_bookings");
  const customers = readList("agc_customers");
  const payments = readList("agc_payments");
  const { allocated, unallocated } = creditMapFromPayments(payments);

  const nextBookings = bookings.map((booking) => {
    const billingReady = isBillingReady(booking);
    return booking.billingReady === billingReady ? booking : { ...booking, billingReady };
  });
  if (JSON.stringify(nextBookings) !== JSON.stringify(bookings)) {
    window.localStorage.setItem("agc_bookings", JSON.stringify(nextBookings));
  }

  const drafts = nextBookings.map((booking) => {
    const kind = paymentKind(booking);
    const customerName = partyNameOf(booking);
    const debit = Number(booking.grandTotal || 0);
    const prepaid = kind === "paid" ? debit : 0;
    return {
      id: `LEDGER-${booking.lrNumber}`,
      lrNumber: booking.lrNumber,
      customerId: customerIdFor(customers, customerName),
      customerName,
      mobile: findCustomer(customers, customerName)?.mobile || booking.consignee?.mobile || booking.consignor?.mobile || "",
      date: booking.date || String(booking.createdAt || "").slice(0, 10),
      type: paymentLabel(kind),
      kind,
      debit,
      credit: prepaid,
      particular: kind === "paid" ? "Paid at booking" : kind === "tbb" ? "TBB Receivable" : "To Pay Receivable",
      createdAt: booking.createdAt || new Date().toISOString(),
      billingReady: Boolean(booking.billingReady),
    };
  });

  drafts.forEach((entry) => {
    if (entry.kind === "paid") return;
    entry.credit = Math.min(entry.debit, Number(allocated[entry.lrNumber] || 0));
  });

  Object.entries(unallocated).forEach(([customerId, amount]) => {
    let remaining = Number(amount || 0);
    drafts
      .filter((entry) => entry.customerId === customerId && entry.kind !== "paid")
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((entry) => {
        if (remaining <= 0) return;
        const due = Math.max(0, entry.debit - entry.credit);
        const apply = Math.min(due, remaining);
        entry.credit += apply;
        remaining -= apply;
      });
  });

  const entries = drafts.map((entry) => {
    const balance = Math.max(0, Number((entry.debit - entry.credit).toFixed(2)));
    const status = balance <= 0 ? "Paid" : entry.credit > 0 ? "Partial" : "Outstanding";
    return { ...entry, credit: Number(entry.credit.toFixed(2)), balance, status };
  });

  window.localStorage.setItem("agc_ledger", JSON.stringify(entries));
  return entries;
}

export const financeTotals = (entries = [], trips = readList("agc_trips")) => ({
  outstanding: entries.reduce((total, entry) => total + Number(entry.balance || 0), 0),
  toPayPending: entries.filter((entry) => entry.kind === "to_pay").reduce((total, entry) => total + Number(entry.balance || 0), 0),
  tbbPending: entries.filter((entry) => entry.kind === "tbb").reduce((total, entry) => total + Number(entry.balance || 0), 0),
  vendorPayable: vendorPayableTotal(trips),
  billingReady: entries.filter((entry) => entry.billingReady).length,
});

function AccountsPage() {
  const [ledger, setLedger] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLedger(syncLedger());
  }, []);

  const totals = useMemo(() => financeTotals(ledger), [ledger]);
  const rows = useMemo(() => ledger.filter((entry) => {
    const query = search.toLowerCase();
    const matchesSearch = !query
      || String(entry.lrNumber || "").toLowerCase().includes(query)
      || String(entry.customerName || "").toLowerCase().includes(query);
    const matchesType = typeFilter === "all" || entry.kind === typeFilter;
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }), [ledger, search, typeFilter, statusFilter]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Finance</p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Accounts &amp; Ledger</h1>
            <p className="mt-1 text-sm text-slate-500">Paid, To Pay and TBB bookings post automatically. Collect full or partial receipts against the LR.</p>
          </div>
          <a href="/accounts/payment" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Receive Payment</a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Outstanding", money(totals.outstanding)],
            ["To Pay Pending", money(totals.toPayPending)],
            ["TBB Pending", money(totals.tbbPending)],
            ["Ready for Billing", totals.billingReady],
          ].map(([label, value]) => (
            <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{value}</p>
            </section>
          ))}
        </div>

        <div className="my-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search LR or customer" className="h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
            <option value="all">All types</option>
            <option value="to_pay">To Pay</option>
            <option value="tbb">TBB</option>
            <option value="paid">Paid</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="Outstanding">Outstanding</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["LR", "Customer", "Type", "Debit", "Credit", "Balance", "Status"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length ? rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-orange-50/30">
                    <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{entry.lrNumber}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{entry.customerName}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{entry.type}</td>
                    <td className="px-5 py-4 text-sm">{money(entry.debit)}</td>
                    <td className="px-5 py-4 text-sm">{money(entry.credit)}</td>
                    <td className="px-5 py-4 text-sm font-bold" style={{ color: entry.balance > 0 ? ORANGE : "#15803d" }}>{money(entry.balance)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.status === "Paid" ? "bg-green-50 text-green-700" : entry.status === "Partial" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>{entry.status}</span>
                      {entry.balance > 0 && (
                        <a href={`/accounts/payment?customerId=${encodeURIComponent(entry.customerId)}&lr=${encodeURIComponent(entry.lrNumber)}`} className="ml-3 text-xs font-bold text-orange-600">Pay</a>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>No ledger records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AccountsPageWithLayout() {
  return <AppLayout><AccountsPage /></AppLayout>;
}
