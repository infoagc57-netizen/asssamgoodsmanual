"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

export default function NewLoadingPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    manifestNumber: "MAN000001",
    date: "",
    departureTime: "",
    fromBranch: "",
    toBranch: "",
    truckNumber: "",
    driverName: "",
    driverMobile: "",
    capacity: "",
  });

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings?status=Booked&notOnLoadingSheet=1&limit=2000");
      const data = await res.json();
      setBookings(res.ok && Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    (async () => {
      try {
        const res = await fetch("/api/loading-sheets/next-number");
        const data = await res.json();
        if (res.ok && data.manifestNumber) {
          setForm((prev) => ({ ...prev, manifestNumber: data.manifestNumber }));
        }
      } catch {
        /* keep default */
      }
    })();

    try {
      const savedVehicles = JSON.parse(window.localStorage.getItem("agc_vehicles") || "[]");
      setVehicles(savedVehicles.filter((vehicle) => (vehicle.status || "Active") === "Active"));
    } catch {
      setVehicles([]);
    }
  }, [loadBookings]);

  const update = (field) => (event) => setForm((previous) => ({
    ...previous,
    [field]: field === "driverMobile"
      ? event.target.value.replace(/\D/g, "").slice(0, 10)
      : event.target.value,
  }));

  const availableBookings = useMemo(
    () => bookings.filter((booking) => (!form.toBranch || booking.route?.deliveryBranch === form.toBranch)),
    [bookings, form.toBranch],
  );

  const selectedBookings = useMemo(
    () => availableBookings.filter((booking) => selected.includes(booking.lrNumber)),
    [availableBookings, selected],
  );

  const summary = useMemo(() => selectedBookings.reduce(
    (total, booking) => ({
      totalLr: total.totalLr + 1,
      totalPackages: total.totalPackages + Number(booking.goods?.packages || 0),
      totalWeight: total.totalWeight + Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0),
      totalFreight: total.totalFreight + Number(booking.grandTotal || 0),
    }),
    { totalLr: 0, totalPackages: 0, totalWeight: 0, totalFreight: 0 },
  ), [selectedBookings]);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.toBranch || !selectedBookings.length) {
      setError("Select a destination branch and at least one booking.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/loading-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifestNumber: form.manifestNumber,
          date: form.date || undefined,
          departureTime: form.departureTime,
          fromBranch: form.fromBranch,
          toBranch: form.toBranch,
          truckNumber: form.truckNumber,
          driverName: form.driverName,
          driverMobile: form.driverMobile,
          lrNumbers: selectedBookings.map((b) => b.lrNumber),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save loading sheet");
      const key = data.sheet?.manifestNumber || form.manifestNumber;
      router.push(`/loading/${encodeURIComponent(key)}`);
    } catch (err) {
      setError(err.message || "Failed to save loading sheet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Link href="/loading" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Loading Sheets / New
            </Link>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Loading Sheet</h1>
          </div>

          <form onSubmit={save} className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Manifest Information</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[["Manifest Number", "manifestNumber", "text"], ["Date", "date", "date"], ["Departure Time", "departureTime", "time"], ["Truck Number", "truckNumber", "text"], ["Driver Name", "driverName", "text"], ["Driver Mobile", "driverMobile", "text"], ["From Branch", "fromBranch", "text"], ["To Branch", "toBranch", "text"]].map(([label, field, type]) => (
                  <label key={field} className="text-xs font-semibold text-slate-700">
                    {label}
                    <input
                      type={type}
                      readOnly={field === "manifestNumber"}
                      required={field === "toBranch"}
                      className={`${inputClass} mt-1.5 ${field === "manifestNumber" ? "bg-slate-100" : ""}`}
                      value={form[field]}
                      onChange={update(field)}
                      list={field === "truckNumber" && vehicles.length ? "agc-active-vehicles" : undefined}
                    />
                  </label>
                ))}
              </div>
              {vehicles.length > 0 && (
                <datalist id="agc-active-vehicles">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id || vehicle.truckNumber} value={vehicle.truckNumber}>
                      {vehicle.vehicleType || ""}
                    </option>
                  ))}
                </datalist>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Available Bookings</h2>
                  <p className="mt-1 text-xs text-slate-500">Booked LRs from MongoDB; filter by destination branch when set.</p>
                </div>
                <div className="text-right text-xs text-slate-500">{selectedBookings.length} selected</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Select", "LR", "Consignor", "Destination", "Packages", "Weight", "Freight"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingBookings ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Loading bookings…</td>
                      </tr>
                    ) : availableBookings.length ? (
                      availableBookings.map((booking) => (
                        <tr key={booking.lrNumber}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(booking.lrNumber)}
                              onChange={() => setSelected((previous) => (
                                previous.includes(booking.lrNumber)
                                  ? previous.filter((lr) => lr !== booking.lrNumber)
                                  : [...previous, booking.lrNumber]
                              ))}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{booking.consignor?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{booking.route?.deliveryBranch || "-"}</td>
                          <td className="px-4 py-3 text-sm">{booking.goods?.packages || 0}</td>
                          <td className="px-4 py-3 text-sm">
                            {Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} KG
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(booking.grandTotal || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                          No booked LRs available{form.toBranch ? " for this destination" : ""}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-4">
              {[["Total LR", summary.totalLr], ["Total Packages", summary.totalPackages], ["Total Weight", `${summary.totalWeight.toFixed(2)} KG`], ["Total Freight", `₹${summary.totalFreight.toFixed(2)}`]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{value}</p>
                </div>
              ))}
            </section>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Link href="/loading" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedBookings.length}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {submitting ? "Saving…" : "Save Loading Sheet"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
