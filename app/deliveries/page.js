"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_bookings";
const DELIVERY_STATUSES = ["Arrived at Branch", "Out for Delivery"];
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const nextTrackingId = (history) => {
  const highest = (history || []).reduce((max, item) => Math.max(max, Number(String(item.id || "").replace("EVT", "")) || 0), 0);
  return `EVT${String(highest + 1).padStart(3, "0")}`;
};

const arrivedDate = (booking) => {
  const tripArrived = (booking.trackingHistory || []).find((entry) => entry.event === "Trip Arrived" || entry.event === "Bag Received at Facility");
  if (tripArrived?.createdAt) return new Date(tripArrived.createdAt).toLocaleDateString("en-IN");
  if (booking.arrivedAt) return String(booking.arrivedAt).slice(0, 10);
  return booking.updatedAt ? new Date(booking.updatedAt).toLocaleDateString("en-IN") : (booking.date || "-");
};

const appendTracking = (booking, event, location, remark) => {
  const history = booking.trackingHistory || [];
  return [...history, {
    id: nextTrackingId(history),
    event,
    location: location || "",
    remark: remark || "",
    createdAt: new Date().toISOString(),
  }];
};

export default function DeliveriesPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [modalBooking, setModalBooking] = useState(null);
  const [form, setForm] = useState({ receiverName: "", receiverMobile: "", remark: "" });
  const [error, setError] = useState("");

  const loadBookings = () => {
    try {
      const records = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setBookings(records.filter((booking) => DELIVERY_STATUSES.includes(booking.status)));
    } catch {
      setBookings([]);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const saveBookings = (updater) => {
    const records = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const next = records.map(updater);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setBookings(next.filter((booking) => DELIVERY_STATUSES.includes(booking.status)));
  };

  const markOutForDelivery = (lrNumber) => {
    saveBookings((booking) => {
      if (booking.lrNumber !== lrNumber || booking.status !== "Arrived at Branch") return booking;
      const location = booking.route?.deliveryBranch || booking.route?.deliveryAt || "";
      return {
        ...booking,
        status: "Out for Delivery",
        trackingHistory: appendTracking(booking, "Out for Delivery", location, "Shipment left for delivery"),
      };
    });
  };

  const openDeliveredModal = (booking) => {
    setError("");
    setForm({ receiverName: "", receiverMobile: "", remark: "" });
    setModalBooking(booking);
  };

  const saveDelivered = (event) => {
    event.preventDefault();
    const receiverName = form.receiverName.trim();
    if (!receiverName) {
      setError("Receiver name is required.");
      return;
    }
    if (!modalBooking || modalBooking.status !== "Out for Delivery") return;
    const deliveredAt = new Date().toISOString();
    const location = modalBooking.route?.deliveryBranch || modalBooking.route?.deliveryAt || "";
    const remark = form.remark.trim();
    saveBookings((booking) => {
      if (booking.lrNumber !== modalBooking.lrNumber) return booking;
      return {
        ...booking,
        status: "Delivered",
        delivery: {
          receiverName,
          receiverMobile: form.receiverMobile.trim(),
          remark,
          deliveredAt,
        },
        trackingHistory: appendTracking(booking, "Delivered", location, remark || "Shipment delivered"),
      };
    });
    setModalBooking(null);
  };

  const visible = bookings.filter((booking) => {
    const query = search.toLowerCase();
    if (!query) return true;
    return String(booking.lrNumber || "").toLowerCase().includes(query)
      || String(booking.consignee?.name || "").toLowerCase().includes(query);
  });

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Deliveries</h1>
            <p className="mt-1 text-sm text-slate-500">Mark arrived shipments out for delivery and capture POD.</p>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input className={inputClass} placeholder="Search LR or consignee" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["LR Number", "Consignee", "From", "To", "Arrived Date", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length ? visible.map((booking) => (
                    <tr key={booking.lrNumber} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{booking.consignee?.name || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{booking.route?.bookingBranch || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{booking.route?.deliveryBranch || booking.route?.deliveryAt || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{arrivedDate(booking)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${booking.status === "Out for Delivery" ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700"}`}>{booking.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                        <a href={`/bookings/${encodeURIComponent(booking.lrNumber)}`} className="mr-3 text-[#0B1F33] hover:text-orange-600">View</a>
                        {booking.status === "Arrived at Branch" && (
                          <button type="button" onClick={() => markOutForDelivery(booking.lrNumber)} className="mr-3 text-orange-600 hover:text-orange-700">Out for Delivery</button>
                        )}
                        <button
                          type="button"
                          disabled={booking.status !== "Out for Delivery"}
                          onClick={() => openDeliveredModal(booking)}
                          className={`text-slate-500 ${booking.status === "Out for Delivery" ? "hover:text-green-700" : "cursor-not-allowed opacity-40"}`}
                        >
                          Delivered
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No deliveries pending.</div>
                        <p className="mt-1 text-xs text-slate-500">LRs appear here after they arrive at the destination branch.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {modalBooking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Mark Delivered · LR {modalBooking.lrNumber}</h3>
            </div>
            <form onSubmit={saveDelivered} className="space-y-4 p-5">
              <label className="block text-xs font-semibold text-slate-700">Receiver Name *
                <input required className={`${inputClass} mt-1.5`} value={form.receiverName} onChange={(e) => setForm((previous) => ({ ...previous, receiverName: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Receiver Mobile
                <input className={`${inputClass} mt-1.5`} inputMode="numeric" value={form.receiverMobile} onChange={(e) => setForm((previous) => ({ ...previous, receiverMobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Remark
                <textarea className="mt-1.5 min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" value={form.remark} onChange={(e) => setForm((previous) => ({ ...previous, remark: e.target.value }))} />
              </label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalBooking(null)} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
