"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const statusTone = (status) => {
  const value = String(status || "Booked");
  if (value === "Delivered") return "agc-status-delivered";
  if (value === "Loaded") return "agc-status-loaded";
  if (value === "In Transit") return "agc-status-transit";
  if (value.includes("Arrived")) return "agc-status-arrived";
  if (value.includes("POD")) return "agc-status-pod";
  return "agc-status-booked";
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    try { setBookings(JSON.parse(window.localStorage.getItem("agc_bookings") || "[]")); } catch { setBookings([]); }
  }, []);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || [booking.lrNumber, booking.consignor?.name, booking.consignee?.name, booking.route?.bookingBranch, booking.route?.deliveryBranch].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesSearch && (!statusFilter || booking.status === statusFilter) && (!dateFrom || (booking.date || "") >= dateFrom) && (!dateTo || (booking.date || "") <= dateTo);
  }), [bookings, search, statusFilter, dateFrom, dateTo]);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ORANGE }}>Operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>Bookings</h1><p className="mt-1 text-sm text-gray-500">Manage and track all your transport bookings</p></div>
        <a href="/bookings/new" className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ New Booking</a>
      </div>
      <div className="mb-5 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3">
        <input type="search" placeholder="Search by LR No, Customer, Vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white" />
        <div className="flex gap-2"><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-[42px] min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm" /><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-[42px] min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-[42px] rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm"><option value="">All Status</option><option value="Booked">Booked</option><option value="Loaded">Loaded</option><option value="In Transit">In Transit</option><option value="Arrived at Branch">Arrived at Branch</option></select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-100"><thead className="bg-gray-50/70"><tr>{["LR No", "Date", "Consignor", "Consignee", "Branch", "Amount", "Payment", "Status", "Action"].map((heading) => <th key={heading} className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{filteredBookings.length ? filteredBookings.map((booking) => <tr key={booking.lrNumber} className="hover:bg-orange-50/30"><td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td><td className="px-5 py-4 text-sm">{booking.date || "-"}</td><td className="px-5 py-4 text-sm">{booking.consignor?.name || "-"}</td><td className="px-5 py-4 text-sm">{booking.consignee?.name || "-"}</td><td className="px-5 py-4 text-sm">{booking.route?.bookingBranch || "-"}</td><td className="px-5 py-4 text-sm font-semibold">₹{Number(booking.grandTotal || 0).toFixed(2)}</td><td className="px-5 py-4 text-xs font-bold uppercase">{booking.paymentType === "to_pay" ? "To Pay" : booking.paymentType === "paid" ? "Paid" : "TBB"}</td><td className="px-5 py-4"><span className={statusTone(booking.status)}>{booking.status || "Booked"}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs font-semibold"><a href={`/bookings/${encodeURIComponent(booking.lrNumber)}`} className="mr-3" style={{ color: NAVY }}>View</a><a href={`/bookings/new?edit=true&lr=${encodeURIComponent(booking.lrNumber)}`} className="text-gray-500">Edit</a></td></tr>) : <tr><td colSpan="9" className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>No bookings yet.</td></tr>}</tbody></table></div></div>
    </AppLayout>
  );
}
