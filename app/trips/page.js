"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

function TripsPage() {
  const [trips, setTrips] = useState([]); const [search, setSearch] = useState("");
  useEffect(() => { setTrips(JSON.parse(window.localStorage.getItem("agc_trips") || "[]")); }, []);
  const visible = trips.filter((trip) => [trip.tripId, trip.manifestNumber, trip.truckNumber, trip.driverName, trip.fromBranch, trip.toBranch].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));
  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p><h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Trips &amp; Dispatch</h1><p className="mt-1 text-sm text-slate-500">Track dispatched vehicles and route progress.</p></div><a href="/loading" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Loading Sheets</a></div><div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trip, manifest, truck, driver or route" className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white" /></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Trip ID", "Manifest", "Truck", "Driver", "Route", "Departure", "Status"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.length ? visible.map((trip) => <tr key={trip.tripId}><td className="px-5 py-4"><a href={`/trips/${trip.tripId}`} className="text-sm font-bold" style={{ color: NAVY }}>{trip.tripId}</a></td><td className="px-5 py-4 text-sm">{trip.manifestNumber}</td><td className="px-5 py-4 text-sm">{trip.truckNumber || "-"}</td><td className="px-5 py-4 text-sm">{trip.driverName || "-"}</td><td className="px-5 py-4 text-sm">{trip.fromBranch || "-"} → {trip.toBranch || "-"}</td><td className="px-5 py-4 text-sm">{trip.departureDate || "-"} {trip.departureTime || ""}</td><td className="px-5 py-4 text-xs font-bold text-orange-700">{trip.status || "Dispatched"}</td></tr>) : <tr><td colSpan="7" className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>No trips found.</td></tr>}</tbody></table></div></div></div></main>;
}

export default function TripsPageWithLayout() {
  return <AppLayout><TripsPage /></AppLayout>;
}
