"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => { setVehicles(JSON.parse(window.localStorage.getItem("agc_vehicles") || "[]")); }, []);
  const disable = (id) => { const updated = vehicles.map((vehicle) => vehicle.id === id ? { ...vehicle, status: "Disabled" } : vehicle); window.localStorage.setItem("agc_vehicles", JSON.stringify(updated)); setVehicles(updated); };
  const visible = vehicles.filter((vehicle) => [vehicle.truckNumber, vehicle.vehicleType, vehicle.driverName, vehicle.route].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));
  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p><h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Vehicle Master</h1><p className="mt-1 text-sm text-slate-500">Manage fleet capacity, drivers, and document expiry.</p></div><a href="/vehicles/new" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Vehicle</a></div><div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search truck, type, driver or route" className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white" /></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Truck Number", "Vehicle Type", "Driver", "Route", "Status", "Insurance Expiry", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.length ? visible.map((vehicle) => <tr key={vehicle.id}><td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{vehicle.truckNumber}</td><td className="px-5 py-4 text-sm">{vehicle.vehicleType || "-"}</td><td className="px-5 py-4 text-sm">{vehicle.driverName || "-"}</td><td className="px-5 py-4 text-sm">{vehicle.route || "-"}</td><td className="px-5 py-4 text-xs font-bold"><span className={vehicle.status === "Disabled" ? "rounded-full bg-slate-100 px-2.5 py-1 text-slate-500" : "rounded-full bg-green-50 px-2.5 py-1 text-green-700"}>{vehicle.status || "Active"}</span></td><td className="px-5 py-4 text-sm">{vehicle.insuranceExpiry || "-"}</td><td className="whitespace-nowrap px-5 py-4 text-xs font-bold"><a href={`/vehicles/${vehicle.id}`} className="mr-3 text-[#0B1F33]">View</a><a href={`/vehicles/${vehicle.id}?edit=true`} className="mr-3 text-slate-500">Edit</a>{vehicle.status !== "Disabled" && <button type="button" onClick={() => disable(vehicle.id)} className="text-slate-500 hover:text-red-600">Disable</button>}</td></tr>) : <tr><td colSpan="7" className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>No vehicles found.</td></tr>}</tbody></table></div></div></div></main>;
}

export default function VehiclesPageWithLayout() {
  return <AppLayout><VehiclesPage /></AppLayout>;
}
