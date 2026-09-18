"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function CustomerDetailsPage() {
  const params = useParams();
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const customers = JSON.parse(window.localStorage.getItem("agc_customers") || "[]");
    const allBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    const record = customers.find((item) => item.id === decodeURIComponent(params?.id || ""));
    setCustomer(record || null);
    setBookings(allBookings.filter((booking) => booking.consignor?.name?.toLowerCase() === record?.name?.toLowerCase() || booking.consignee?.name?.toLowerCase() === record?.name?.toLowerCase()).slice(-10).reverse());
  }, [params]);

  if (!customer) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold" style={{ color: NAVY }}>Customer not found</h1><a href="/customers" className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Customers</a></div></main>;

  const stats = bookings.reduce((result, booking) => { result.total += 1; result.amount += Number(booking.grandTotal || 0); result.lastDate = result.lastDate || booking.date; return result; }, { total: 0, amount: 0, lastDate: "-" });

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><a href="/customers" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Customer Master / Details</a><h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{customer.name}</h1><p className="mt-1 text-sm text-slate-500">{customer.id} · {customer.mobile} · {customer.gst || "GST not available"}</p></div><div className="flex gap-2"><a href={`/customers/${customer.id}?edit=true`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Edit Customer</a><a href={`/bookings/new?customer=${customer.id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>New Booking</a><button type="button" onClick={() => window.alert("Ledger printing is reserved for the next workflow step.")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Print Ledger</button></div></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Information</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Address", customer.address], ["Pincode", customer.pincode], ["City", customer.city], ["State", customer.state], ["Customer Type", customer.customerType], ["Default Payment", customer.defaultPayment === "to_pay" ? "To Pay" : customer.defaultPayment === "paid" ? "Paid" : "TBB"]].map(([label, value]) => <div key={label}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</p></div>)}</div></section>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">{[["Total Bookings", stats.total], ["Last Booking Date", stats.lastDate], ["Outstanding Amount", money(0)]].map(([label, value]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{value}</p></section>)}</div>
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Recent Bookings</h2></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["LR", "Date", "Destination", "Amount", "Status"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{bookings.length ? bookings.map((booking) => <tr key={booking.lrNumber}><td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td><td className="px-5 py-3 text-sm text-slate-600">{booking.date || "-"}</td><td className="px-5 py-3 text-sm text-slate-700">{booking.route?.deliveryAt || booking.route?.deliveryBranch || "-"}</td><td className="px-5 py-3 text-sm font-semibold text-slate-800">{money(booking.grandTotal)}</td><td className="px-5 py-3 text-xs font-bold text-orange-700">{booking.status || "Booked"}</td></tr>) : <tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-slate-500">No bookings found for this customer.</td></tr>}</tbody></table></div></section>
  </div></main>;
}
