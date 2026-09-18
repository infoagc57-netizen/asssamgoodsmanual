"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function BranchDetailsPage() {
  const params = useParams();
  const [branch, setBranch] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const branches = JSON.parse(window.localStorage.getItem("agc_branches") || "[]");
    const allBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    const record = branches.find((item) => item.id === decodeURIComponent(params?.id || ""));
    setBranch(record || null);
    setBookings(allBookings.filter((booking) => booking.route?.bookingBranch === record?.code).reverse());
  }, [params]);

  if (!branch) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold" style={{ color: NAVY }}>Branch not found</h1><a href="/branches" className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Branches</a></div></main>;
  const revenue = bookings.reduce((total, booking) => total + Number(booking.grandTotal || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((booking) => booking.date === today).length;

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><a href="/branches" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Branch Master / Details</a><h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{branch.name}</h1><p className="mt-1 text-sm text-slate-500">{branch.id} · {branch.code} · {branch.city}, {branch.state}</p></div><div className="flex gap-2"><a href="/branches" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</a><a href={`/branches/${branch.id}?edit=true`} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Edit Branch</a></div></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Branch Information</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Branch Code", branch.code], ["City", branch.city], ["State", branch.state], ["Manager", branch.manager], ["Mobile", branch.mobile], ["Email", branch.email], ["Pincode", branch.pincode], ["Status", branch.status || "Active"], ["Address", branch.address]].map(([label, value]) => <div key={label}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</p></div>)}</div></section><div className="mt-4 grid gap-4 sm:grid-cols-3">{[["Today's Bookings", todayBookings], ["Total Bookings", bookings.length], ["Revenue", money(revenue)]].map(([label, value]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{value}</p></section>)}</div><section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Recent LR</h2></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["LR", "Date", "Destination", "Amount", "Status"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{bookings.slice(0, 10).map((booking) => <tr key={booking.lrNumber}><td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td><td className="px-5 py-3 text-sm text-slate-600">{booking.date || "-"}</td><td className="px-5 py-3 text-sm text-slate-700">{booking.route?.deliveryAt || booking.route?.deliveryBranch || "-"}</td><td className="px-5 py-3 text-sm font-semibold">{money(booking.grandTotal)}</td><td className="px-5 py-3 text-xs font-bold text-orange-700">{booking.status || "Booked"}</td></tr>)}{!bookings.length && <tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-slate-500">No bookings found for this branch.</td></tr>}</tbody></table></div></section></div></main>;
}
