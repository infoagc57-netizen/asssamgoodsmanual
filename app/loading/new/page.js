"use client";

import { useEffect, useMemo, useState } from "react";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const nextManifestNumber = (sheets) => {
  const highest = sheets.reduce((max, sheet) => Math.max(max, Number(String(sheet.manifestNumber || "").replace("MAN", "")) || 0), 0);
  return `MAN${String(highest + 1).padStart(6, "0")}`;
};

export default function NewLoadingPage() {
  const [sheets, setSheets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ manifestNumber: "MAN000001", date: "", departureTime: "", fromBranch: "", toBranch: "", truckNumber: "", driverName: "", driverMobile: "", capacity: "" });

  useEffect(() => {
    const savedSheets = JSON.parse(window.localStorage.getItem("agc_loading_sheets") || "[]");
    const savedBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    const savedVehicles = JSON.parse(window.localStorage.getItem("agc_vehicles") || "[]");
    setSheets(savedSheets);
    setBookings(savedBookings.filter((booking) => booking.status === "Booked"));
    setVehicles(savedVehicles.filter((vehicle) => (vehicle.status || "Active") === "Active"));
    setForm((previous) => ({ ...previous, manifestNumber: nextManifestNumber(savedSheets) }));
  }, []);

  useEffect(() => {
    if (!vehicles.length) return undefined;
    const truckInput = Array.from(document.querySelectorAll("input")).find((input) => input.value === form.truckNumber && input.parentElement?.textContent?.includes("Truck Number"));
    if (!truckInput) return undefined;
    const listId = "agc-active-vehicles";
    truckInput.setAttribute("list", listId);
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = listId;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = vehicles.map((vehicle) => `<option value="${vehicle.truckNumber}">${vehicle.vehicleType || ""}</option>`).join("");
    const handleVehicleInput = (event) => {
      const vehicle = vehicles.find((item) => item.truckNumber === event.target.value);
      if (vehicle) setForm((previous) => ({ ...previous, truckNumber: vehicle.truckNumber, driverName: vehicle.driverName || "", driverMobile: vehicle.driverMobile || "", capacity: vehicle.capacity || "" }));
    };
    truckInput.addEventListener("change", handleVehicleInput);
    return () => truckInput.removeEventListener("change", handleVehicleInput);
  }, [vehicles, form.truckNumber]);

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: field === "driverMobile" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value }));
  const selectVehicle = (vehicle) => { setForm((previous) => ({ ...previous, truckNumber: vehicle.truckNumber, driverName: vehicle.driverName, driverMobile: vehicle.driverMobile, capacity: vehicle.capacity })); setVehicleSearchOpen(false); };
  const vehicleMatches = vehicles.filter((vehicle) => [vehicle.truckNumber, vehicle.vehicleType, vehicle.route].some((value) => String(value || "").toLowerCase().includes(form.truckNumber.toLowerCase()))).slice(0, 8);
  const availableBookings = bookings.filter((booking) => (!form.toBranch || booking.route?.deliveryBranch === form.toBranch));
  const selectedBookings = availableBookings.filter((booking) => selected.includes(booking.lrNumber));
  const summary = useMemo(() => selectedBookings.reduce((total, booking) => ({ totalLr: total.totalLr + 1, totalPackages: total.totalPackages + Number(booking.goods?.packages || 0), totalWeight: total.totalWeight + Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0), totalFreight: total.totalFreight + Number(booking.grandTotal || 0) }), { totalLr: 0, totalPackages: 0, totalWeight: 0, totalFreight: 0 }), [selectedBookings]);

  const save = (event) => {
    event.preventDefault();
    if (!form.toBranch || !selectedBookings.length) return;
      const manifest = { ...form, selectedLrNumbers: selectedBookings.map((booking) => booking.lrNumber), bookings: selectedBookings, summary, status: "Created", createdAt: new Date().toISOString() };
    const nextSheets = [...sheets, manifest];
    const allBookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]").map((booking) => selected.includes(booking.lrNumber) ? { ...booking, status: "Loaded", manifestNumber: form.manifestNumber } : booking);
    window.localStorage.setItem("agc_loading_sheets", JSON.stringify(nextSheets));
    window.localStorage.setItem("agc_bookings", JSON.stringify(allBookings));
    window.location.href = `/loading/${form.manifestNumber}`;
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-6"><a href="/loading" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Loading Sheets / New</a><h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Loading Sheet</h1></div><form onSubmit={save} className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Manifest Information</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Manifest Number", "manifestNumber"], ["Date", "date"], ["Departure Time", "departureTime"], ["Truck Number", "truckNumber"], ["Driver Name", "driverName"], ["Driver Mobile", "driverMobile"], ["From Branch", "fromBranch"], ["To Branch", "toBranch"]].map(([label, field]) => <label key={field} className="text-xs font-semibold text-slate-700">{label}<input type={field === "date" ? "date" : field === "departureTime" ? "time" : "text"} readOnly={field === "manifestNumber"} required={field === "toBranch"} className={`${inputClass} mt-1.5 ${field === "manifestNumber" ? "bg-slate-100" : ""}`} value={form[field]} onChange={update(field)} /></label>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Available Bookings</h2><p className="mt-1 text-xs text-slate-500">Only booked LR records matching the destination branch are selectable.</p></div><div className="text-right text-xs text-slate-500">{selectedBookings.length} selected</div></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Select", "LR", "Consignor", "Destination", "Packages", "Weight", "Freight"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{availableBookings.length ? availableBookings.map((booking) => <tr key={booking.lrNumber}><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(booking.lrNumber)} onChange={() => setSelected((previous) => previous.includes(booking.lrNumber) ? previous.filter((lr) => lr !== booking.lrNumber) : [...previous, booking.lrNumber])} /></td><td className="px-4 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td><td className="px-4 py-3 text-sm text-slate-700">{booking.consignor?.name || "-"}</td><td className="px-4 py-3 text-sm text-slate-600">{booking.route?.deliveryBranch || "-"}</td><td className="px-4 py-3 text-sm">{booking.goods?.packages || 0}</td><td className="px-4 py-3 text-sm">{Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} KG</td><td className="px-4 py-3 text-sm">₹{Number(booking.grandTotal || 0).toFixed(2)}</td></tr>) : <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-500">No booked LRs available for this destination.</td></tr>}</tbody></table></div></section><section className="grid gap-3 sm:grid-cols-4">{[["Total LR", summary.totalLr], ["Total Packages", summary.totalPackages], ["Total Weight", `${summary.totalWeight.toFixed(2)} KG`], ["Total Freight", `₹${summary.totalFreight.toFixed(2)}`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{value}</p></div>)}</section><div className="flex justify-end gap-2"><a href="/loading" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</a><button type="submit" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Loading Sheet</button></div></form></div></main>;
}
