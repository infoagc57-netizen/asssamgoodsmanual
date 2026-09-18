"use client";

import { useEffect, useState } from "react";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "mt-1.5 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const nextTripId = (trips) => {
  const next = trips.reduce((max, trip) => Math.max(max, Number(String(trip.tripId || "").replace("TRIP", "")) || 0), 0) + 1;
  return `TRIP${String(next).padStart(6, "0")}`;
};

const readList = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const driverNameOf = (driver) => driver?.name || driver?.driverName || "";
const driverMobileOf = (driver) => driver?.mobile || driver?.driverMobile || "";

const dispatchTrip = (form, sheet, extras) => {
  const trips = readList("agc_trips");
  const sheets = readList("agc_loading_sheets");
  const vehicles = readList("agc_vehicles");
  const bookings = readList("agc_bookings");
  const lrNumbers = (sheet?.selectedLrNumbers || (sheet?.bookings || []).map((booking) => booking.lrNumber)).filter(Boolean);
  const trip = {
    tripId: form.tripId,
    tripType: form.tripType,
    manifestNumber: form.manifestNumber,
    vendorId: form.tripType === "Hire Vehicle" ? form.vendorId : "",
    vendorName: form.tripType === "Hire Vehicle" ? extras.vendorName : "",
    vehicleId: form.tripType === "Own Vehicle" ? form.vehicleId : "",
    truckNumber: form.truckNumber.trim().toUpperCase(),
    driverId: form.driverId,
    driverName: extras.driverName,
    driverMobile: extras.driverMobile,
    fromBranch: form.fromBranch,
    toBranch: form.toBranch,
    departureDate: form.departureDate,
    departureTime: form.departureTime,
    eta: form.eta,
    remarks: form.remarks,
    status: "Dispatched",
    createdAt: new Date().toISOString(),
    timeline: [{ status: "Dispatched", at: new Date().toISOString() }],
    summary: sheet?.summary || {},
    bookings: sheet?.bookings || [],
  };

  window.localStorage.setItem("agc_trips", JSON.stringify([...trips, trip]));
  window.localStorage.setItem("agc_loading_sheets", JSON.stringify(sheets.map((item) => (
    item.manifestNumber === form.manifestNumber
      ? { ...item, status: "Dispatched", tripId: form.tripId, dispatchedAt: new Date().toISOString(), truckNumber: trip.truckNumber, driverName: trip.driverName, driverMobile: trip.driverMobile }
      : item
  ))));
  window.localStorage.setItem("agc_bookings", JSON.stringify(bookings.map((booking) => (
    lrNumbers.includes(booking.lrNumber) ? { ...booking, status: "In Transit", tripId: form.tripId } : booking
  ))));
  if (form.tripType === "Own Vehicle" && form.vehicleId) {
    window.localStorage.setItem("agc_vehicles", JSON.stringify(vehicles.map((vehicle) => (
      vehicle.id === form.vehicleId || vehicle.truckNumber === trip.truckNumber
        ? { ...vehicle, status: "On Trip" }
        : vehicle
    ))));
  }
  window.location.href = `/trips/${form.tripId}`;
};

export default function NewTripPage() {
  const [manifests, setManifests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tripId: "TRIP000001",
    tripType: "Own Vehicle",
    manifestNumber: "",
    vehicleId: "",
    vendorId: "",
    truckNumber: "",
    driverId: "",
    fromBranch: "",
    toBranch: "",
    departureDate: "",
    departureTime: "",
    eta: "",
    remarks: "",
  });

  useEffect(() => {
    const sheets = readList("agc_loading_sheets");
    const trips = readList("agc_trips");
    const openSheets = sheets.filter((sheet) => sheet.status !== "Dispatched");
    setManifests(openSheets);
    setVehicles(readList("agc_vehicles").filter((vehicle) => vehicle.status !== "Disabled"));
    setVendors(readList("agc_vendors").filter((vendor) => vendor.status !== "Inactive"));
    setDrivers(readList("agc_drivers").filter((driver) => driver.status !== "Inactive" && driver.status !== "Disabled"));
    const tripId = nextTripId(trips);
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("manifest");
    setForm((previous) => {
      const next = { ...previous, tripId };
      if (!preset) return next;
      const sheet = openSheets.find((item) => item.manifestNumber === preset);
      if (!sheet) return { ...next, manifestNumber: preset };
      return {
        ...next,
        manifestNumber: preset,
        truckNumber: sheet.truckNumber || "",
        fromBranch: sheet.fromBranch || "",
        toBranch: sheet.toBranch || "",
        departureDate: sheet.date || "",
        departureTime: sheet.departureTime || "",
      };
    });
  }, []);

  const selectManifest = (manifestNumber) => {
    const sheet = manifests.find((item) => item.manifestNumber === manifestNumber);
    setForm((previous) => ({
      ...previous,
      manifestNumber,
      truckNumber: previous.tripType === "Hire Vehicle" ? previous.truckNumber : (sheet?.truckNumber || previous.truckNumber),
      fromBranch: sheet?.fromBranch || "",
      toBranch: sheet?.toBranch || "",
      departureDate: sheet?.date || "",
      departureTime: sheet?.departureTime || "",
    }));
  };

  const selectVehicle = (vehicleId) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    setForm((previous) => ({
      ...previous,
      vehicleId,
      truckNumber: vehicle?.truckNumber || "",
      driverId: previous.driverId || "",
    }));
  };

  const save = (event) => {
    event.preventDefault();
    if (!form.manifestNumber) {
      setError("Select a manifest.");
      return;
    }
    if (form.tripType === "Own Vehicle") {
      if (!form.vehicleId) {
        setError("Vehicle is required for own-vehicle trips.");
        return;
      }
      if (!form.driverId) {
        setError("Driver is required for own-vehicle trips.");
        return;
      }
    } else {
      if (!form.vendorId) {
        setError("Vendor is required for hire-vehicle trips.");
        return;
      }
      if (!form.truckNumber.trim()) {
        setError("Vehicle number is required for hire-vehicle trips.");
        return;
      }
    }

    const sheet = readList("agc_loading_sheets").find((item) => item.manifestNumber === form.manifestNumber);
    if (!sheet || sheet.status === "Dispatched") {
      setError("This manifest is not available for dispatch.");
      return;
    }
    const vendor = vendors.find((item) => item.id === form.vendorId);
    const driver = drivers.find((item) => item.id === form.driverId);
    dispatchTrip(form, sheet, {
      vendorName: vendor?.name || "",
      driverName: driverNameOf(driver) || sheet.driverName || "",
      driverMobile: driverMobileOf(driver) || sheet.driverMobile || "",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <a href="/trips" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trips / New</a>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Trip</h1>
          <p className="mt-1 text-sm text-slate-500">Dispatch a manifest on an own or hire vehicle.</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Trip Type</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Own Vehicle", "Hire Vehicle"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((previous) => ({
                    ...previous,
                    tripType: type,
                    vehicleId: type === "Own Vehicle" ? previous.vehicleId : "",
                    vendorId: type === "Hire Vehicle" ? previous.vendorId : "",
                    truckNumber: type === "Hire Vehicle" ? previous.truckNumber : previous.truckNumber,
                  }))}
                  className={`h-[42px] rounded-xl text-sm font-semibold ${form.tripType === type ? "text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                  style={form.tripType === type ? { backgroundColor: type === "Hire Vehicle" ? ORANGE : NAVY } : undefined}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Manifest &amp; Route</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Manifest Number *
                <select required value={form.manifestNumber} onChange={(event) => selectManifest(event.target.value)} className={inputClass}>
                  <option value="">Select manifest</option>
                  {manifests.map((sheet) => (
                    <option key={sheet.manifestNumber} value={sheet.manifestNumber}>{sheet.manifestNumber} · {sheet.fromBranch} → {sheet.toBranch}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Trip ID
                <input readOnly value={form.tripId} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700">From Branch
                <input readOnly value={form.fromBranch} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700">To Branch
                <input readOnly value={form.toBranch} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Departure Date
                <input readOnly type="date" value={form.departureDate} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Departure Time
                <input readOnly type="time" value={form.departureTime} className={inputClass} />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Vehicle &amp; Driver</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {form.tripType === "Own Vehicle" ? (
                <label className="text-xs font-semibold text-slate-700">Vehicle *
                  <select required value={form.vehicleId} onChange={(event) => selectVehicle(event.target.value)} className={inputClass}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.truckNumber} · {vehicle.vehicleType || "Vehicle"}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="text-xs font-semibold text-slate-700">Vendor *
                    <select required value={form.vendorId} onChange={(event) => setForm((previous) => ({ ...previous, vendorId: event.target.value }))} className={inputClass}>
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.id})</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Vehicle Number *
                    <input required value={form.truckNumber} onChange={(event) => setForm((previous) => ({ ...previous, truckNumber: event.target.value }))} className={inputClass} placeholder="Enter hire vehicle number" />
                  </label>
                </>
              )}
              <label className="text-xs font-semibold text-slate-700">Driver{form.tripType === "Own Vehicle" ? " *" : " (optional)"}
                <select required={form.tripType === "Own Vehicle"} value={form.driverId} onChange={(event) => setForm((previous) => ({ ...previous, driverId: event.target.value }))} className={inputClass}>
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driverNameOf(driver)} {driverMobileOf(driver) ? `· ${driverMobileOf(driver)}` : ""}</option>
                  ))}
                </select>
              </label>
              {form.tripType === "Own Vehicle" && (
                <label className="text-xs font-semibold text-slate-700">Vehicle Number
                  <input readOnly value={form.truckNumber} className={inputClass} />
                </label>
              )}
              <label className="text-xs font-semibold text-slate-700">ETA
                <input type="time" value={form.eta} onChange={(event) => setForm((previous) => ({ ...previous, eta: event.target.value }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Remarks
                <input value={form.remarks} onChange={(event) => setForm((previous) => ({ ...previous, remarks: event.target.value }))} className={inputClass} />
              </label>
            </div>
          </section>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <a href="/trips" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</a>
            <button className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Create Trip</button>
          </div>
        </form>
      </div>
    </main>
  );
}
