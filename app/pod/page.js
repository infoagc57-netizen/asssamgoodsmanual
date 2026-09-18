"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_bookings";
const MAX_BYTES = 5 * 1024 * 1024;
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const nextTrackingId = (history) => {
  const highest = (history || []).reduce((max, item) => Math.max(max, Number(String(item.id || "").replace("EVT", "")) || 0), 0);
  return `EVT${String(highest + 1).padStart(3, "0")}`;
};

const deliveredDate = (booking) => {
  if (booking.delivery?.deliveredAt) return new Date(booking.delivery.deliveredAt).toLocaleDateString("en-IN");
  const delivered = (booking.trackingHistory || []).find((entry) => entry.event === "Delivered");
  if (delivered?.createdAt) return new Date(delivered.createdAt).toLocaleDateString("en-IN");
  return booking.date || "-";
};

const isAllowedFile = (file) => {
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type.startsWith("image/") || type === "application/pdf" || name.endsWith(".pdf");
};

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(new Error("Could not read file."));
  reader.readAsDataURL(file);
});

export default function PodPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [modalBooking, setModalBooking] = useState(null);
  const [form, setForm] = useState({ file: null, podNumber: "", remark: "" });
  const [error, setError] = useState("");

  const loadBookings = () => {
    try {
      const records = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setBookings(records.filter((booking) => booking.status === "Delivered" && !booking.pod));
    } catch {
      setBookings([]);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const openModal = (booking) => {
    setError("");
    setForm({ file: null, podNumber: "", remark: "" });
    setModalBooking(booking);
  };

  const savePod = async (event) => {
    event.preventDefault();
    if (!modalBooking) return;
    const file = form.file;
    if (!file) {
      setError("POD image or PDF is required.");
      return;
    }
    if (!isAllowedFile(file)) {
      setError("Upload an image or PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be 5 MB or smaller.");
      return;
    }

    let fileData = "";
    try {
      fileData = await readAsDataUrl(file);
    } catch {
      setError("Could not read file.");
      return;
    }

    const receivedAt = new Date().toISOString();
    const location = modalBooking.route?.deliveryBranch || modalBooking.route?.deliveryAt || "";
    const records = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const next = records.map((booking) => {
      if (booking.lrNumber !== modalBooking.lrNumber) return booking;
      const history = booking.trackingHistory || [];
      return {
        ...booking,
        pod: {
          fileName: file.name,
          fileType: file.type || (String(file.name).toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          fileData,
          podNumber: form.podNumber.trim(),
          remark: form.remark.trim(),
          receivedAt,
        },
        trackingHistory: [...history, {
          id: nextTrackingId(history),
          event: "POD Received",
          location,
          remark: "POD uploaded",
          createdAt: receivedAt,
        }],
      };
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setBookings(next.filter((booking) => booking.status === "Delivered" && !booking.pod));
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
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>POD</h1>
            <p className="mt-1 text-sm text-slate-500">Collect proof of delivery for delivered shipments.</p>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input className={inputClass} placeholder="Search LR or consignee" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["LR Number", "Consignee", "Delivered Date", "Receiver", "Action"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length ? visible.map((booking) => (
                    <tr key={booking.lrNumber} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{booking.consignee?.name || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{deliveredDate(booking)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{booking.delivery?.receiverName || "-"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                        <button type="button" onClick={() => openModal(booking)} className="text-orange-600 hover:text-orange-700">Upload</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No pending PODs.</div>
                        <p className="mt-1 text-xs text-slate-500">Delivered LRs without a POD file appear here.</p>
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
              <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Upload POD · LR {modalBooking.lrNumber}</h3>
            </div>
            <form onSubmit={savePod} className="space-y-4 p-5">
              <label className="block text-xs font-semibold text-slate-700">POD Image or PDF *
                <input
                  required
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="mt-1.5 w-full text-sm text-slate-600 file:mr-3 file:h-[42px] file:rounded-xl file:border-0 file:bg-orange-50 file:px-4 file:text-sm file:font-semibold file:text-orange-700"
                  onChange={(e) => setForm((previous) => ({ ...previous, file: e.target.files?.[0] || null }))}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">POD Number
                <input className={`${inputClass} mt-1.5`} value={form.podNumber} onChange={(e) => setForm((previous) => ({ ...previous, podNumber: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Remark
                <textarea className="mt-1.5 min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" value={form.remark} onChange={(e) => setForm((previous) => ({ ...previous, remark: e.target.value }))} />
              </label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
              <p className="text-xs text-slate-500">Maximum file size 5 MB.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalBooking(null)} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save POD</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
