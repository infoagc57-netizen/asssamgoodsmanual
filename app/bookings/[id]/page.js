"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const paymentLabel = (value) => value === "to_pay" ? "TO PAY" : value === "paid" ? "PAID" : "TBB";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const text = (value) => value || "-";

const TRACKING_EVENTS = [
  "Manifest Uploaded",
  "Shipment Picked Up",
  "Vehicle Departed from Client Location",
  "Shipment Received at Origin Center",
  "Weight Captured",
  "Added to Bag",
  "Bag Added to Trip",
  "Vehicle Departed",
  "Trip Arrived",
  "Bag Received at Facility",
  "Out for Delivery",
  "Delivered",
  "POD Received",
  "Shipment On Hold",
  "Shipment Damaged",
];

const emptyTrackingForm = { event: "", location: "", remark: "" };

const trackingTone = (event) => {
  if (event === "Shipment Damaged") return "damaged";
  if (event === "Shipment On Hold") return "hold";
  if (["Out for Delivery", "Delivered", "POD Received"].includes(event)) return "delivery";
  if (["Shipment Picked Up", "Vehicle Departed from Client Location", "Weight Captured"].includes(event)) return "pickup";
  return "transit";
};

const trackingColors = {
  pickup: { bg: "bg-orange-50", fg: "text-orange-600", ring: "bg-orange-500" },
  transit: { bg: "bg-sky-50", fg: "text-sky-700", ring: "bg-sky-500" },
  delivery: { bg: "bg-emerald-50", fg: "text-emerald-700", ring: "bg-emerald-500" },
  hold: { bg: "bg-amber-50", fg: "text-amber-700", ring: "bg-amber-500" },
  damaged: { bg: "bg-rose-50", fg: "text-rose-700", ring: "bg-rose-500" },
};

function TrackingIcon({ event }) {
  const tone = trackingTone(event);
  const className = "h-4 w-4";
  if (tone === "pickup") {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
  }
  if (tone === "delivery") {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
  }
  if (tone === "hold") {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
  if (tone === "damaged") {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>;
  }
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function formatTrackingStamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return `${day} • ${time}`;
}

function nextTrackingId(history) {
  const highest = history.reduce((max, item) => Math.max(max, Number(String(item.id || "").replace("EVT", "")) || 0), 0);
  return `EVT${String(highest + 1).padStart(3, "0")}`;
}

function DetailCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DetailGrid({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800">{text(value)}</p>
        </div>
      ))}
    </div>
  );
}

function LrBarcode({ value }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !value) return;
    JsBarcode(barcodeRef.current, value, {
      format: "CODE128",
      displayValue: false,
      height: 42,
      width: 2,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [value]);

  return (
    <div className="lr-barcode-box">
      <svg ref={barcodeRef} />
      <span>{value}</span>
    </div>
  );
}

export default function BookingDetailsPage() {
  const params = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountCustomerId, setAccountCustomerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingForm, setTrackingForm] = useState(emptyTrackingForm);
  const [trackingError, setTrackingError] = useState("");
  const [editingTrackingId, setEditingTrackingId] = useState("");
  const [trackingMenuId, setTrackingMenuId] = useState("");

  useEffect(() => {
    try {
      const records = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
      const lrNumber = decodeURIComponent(params?.id || "");
      const record = records.find((item) => item.lrNumber === lrNumber) || null;
      setBooking(record);
      setTrackingHistory(record?.trackingHistory || []);
      const customers = JSON.parse(window.localStorage.getItem("agc_customers") || "[]");
      const customer = customers.find((item) => item.name.toLowerCase() === record?.consignor?.name?.toLowerCase());
      setAccountCustomerId(customer?.id || "");
      const credits = JSON.parse(window.localStorage.getItem("agc_ledger") || "[]").filter((entry) => entry.customerId === customer?.id && entry.credit > 0).reduce((total, entry) => total + Number(entry.credit || 0), 0);
      const total = Number(record?.grandTotal || 0);
      setPaymentStatus(record?.paymentType === "paid" || credits >= total ? "Paid" : credits > 0 ? "Partial" : "Pending");
    } catch {
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading booking...</div>;
  if (!booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Booking not found</h1>
          <p className="mt-2 text-sm text-slate-500">No local booking exists for this LR number.</p>
          <a href="/bookings" className="mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Bookings</a>
        </div>
      </main>
    );
  }

  const charges = booking.charges || {};
  const dimensions = booking.dimensions || {};
  const goods = booking.goods || {};
  const consignor = booking.consignor || {};
  const consignee = booking.consignee || {};
  const route = booking.route || {};
  const orderedTracking = [...trackingHistory].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const persistTrackingHistory = (nextHistory) => {
    const records = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
    const index = records.findIndex((item) => item.lrNumber === booking.lrNumber);
    if (index === -1) return;
    records[index] = { ...records[index], trackingHistory: nextHistory };
    window.localStorage.setItem("agc_bookings", JSON.stringify(records));
    setTrackingHistory(nextHistory);
    setBooking(records[index]);
  };

  const openTrackingModal = (entry) => {
    setTrackingError("");
    setTrackingMenuId("");
    if (entry) {
      setEditingTrackingId(entry.id);
      setTrackingForm({ event: entry.event || "", location: entry.location || "", remark: entry.remark || "" });
    } else {
      setEditingTrackingId("");
      setTrackingForm(emptyTrackingForm);
    }
    setTrackingModalOpen(true);
  };

  const closeTrackingModal = () => {
    setTrackingModalOpen(false);
    setEditingTrackingId("");
    setTrackingForm(emptyTrackingForm);
    setTrackingError("");
  };

  const saveTrackingUpdate = (event) => {
    event.preventDefault();
    const selectedEvent = trackingForm.event.trim();
    const location = trackingForm.location.trim();
    if (!selectedEvent) {
      setTrackingError("Please select an event.");
      return;
    }
    if (!location) {
      setTrackingError("Please enter a location.");
      return;
    }

    if (editingTrackingId) {
      persistTrackingHistory(trackingHistory.map((item) => item.id === editingTrackingId
        ? { ...item, event: selectedEvent, location, remark: trackingForm.remark.trim() }
        : item));
    } else {
      persistTrackingHistory([...trackingHistory, {
        id: nextTrackingId(trackingHistory),
        event: selectedEvent,
        location,
        remark: trackingForm.remark.trim(),
        createdAt: new Date().toISOString(),
      }]);
    }
    closeTrackingModal();
  };

  const deleteTrackingUpdate = (entry) => {
    setTrackingMenuId("");
    if (!window.confirm("Delete this tracking update?")) return;
    persistTrackingHistory(trackingHistory.filter((item) => item.id !== entry.id));
  };

  return (
    <AppLayout>
    <>
    <main className="booking-details-screen print:hidden min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/bookings" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-orange-600">Bookings / Details</a>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: NAVY }}>LR {booking.lrNumber}</h1>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{booking.status || "Booked"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/bookings" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</a>
            <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Print</button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
          <DetailCard title="Booking Summary">
            <DetailGrid items={[
              ["LR Number", booking.lrNumber],
              ["Date", booking.date],
              ["Time", booking.time],
              ["Booking Branch", route.bookingBranch],
              ["Delivery Branch", route.deliveryBranch],
              ["Delivery At", route.deliveryAt],
              ["Payment Type", paymentLabel(booking.paymentType)],
              ["Status", booking.status || "Booked"],
              ["Manifest Number", booking.manifestNumber || "Not loaded"],
            ]} />
          </DetailCard>
          <section className="rounded-2xl p-5 text-white shadow-sm" style={{ backgroundColor: NAVY }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Grand Total</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: ORANGE }}>{money(booking.grandTotal)}</p>
            <p className="mt-3 text-sm text-slate-300">Payment: <span className="font-semibold text-white">{paymentLabel(booking.paymentType)}</span></p>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Payment</h2>
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-600"><span>Type: <b className="text-slate-900">{paymentLabel(booking.paymentType)}</b></span><span>Grand Total: <b className="text-slate-900">{money(booking.grandTotal)}</b></span><span>Status: <b className={`rounded-full px-2.5 py-1 text-xs ${paymentStatus === "Paid" ? "bg-green-50 text-green-700" : paymentStatus === "Partial" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>{paymentStatus}</b></span></div>
            </div>
            {accountCustomerId && <a href={`/accounts/${accountCustomerId}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>View Ledger</a>}
          </div>
        </section>

        {booking.status === "Delivered" && booking.delivery && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Delivery Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Receiver", booking.delivery.receiverName],
                ["Mobile", booking.delivery.receiverMobile],
                ["Delivered At", booking.delivery.deliveredAt ? new Date(booking.delivery.deliveredAt).toLocaleString("en-IN") : "-"],
                ["Remark", booking.delivery.remark],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">{text(value)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {booking.pod && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>POD Information</h2>
              {booking.pod.fileData && (
                <a
                  href={booking.pod.fileData}
                  download={booking.pod.fileName || "pod"}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  Download
                </a>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">POD Number</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{text(booking.pod.podNumber)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Received Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{booking.pod.receivedAt ? new Date(booking.pod.receivedAt).toLocaleString("en-IN") : "-"}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">File Preview</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {String(booking.pod.fileType || "").startsWith("image/") || String(booking.pod.fileData || "").startsWith("data:image/") ? (
                  <img src={booking.pod.fileData} alt={booking.pod.fileName || "POD"} className="max-h-80 w-full object-contain" />
                ) : String(booking.pod.fileType || "").includes("pdf") || String(booking.pod.fileName || "").toLowerCase().endsWith(".pdf") ? (
                  <iframe title="POD PDF" src={booking.pod.fileData} className="h-80 w-full" />
                ) : (
                  <p className="px-4 py-8 text-center text-sm font-semibold text-slate-600">{booking.pod.fileName || "POD file"}</p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Tracking Updates</h2>
            <button type="button" onClick={() => openTrackingModal()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Add Tracking Update</button>
          </div>
          <div className="p-5">
            {orderedTracking.length ? (
              <ol className="relative ml-3 border-l border-slate-200 pl-8">
                {orderedTracking.map((entry) => {
                  const tone = trackingColors[trackingTone(entry.event)] || trackingColors.transit;
                  return (
                    <li key={entry.id} className="relative pb-8 last:pb-0">
                      <span className={`absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full ${tone.bg} ${tone.fg}`}>
                        <TrackingIcon event={entry.event} />
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-400">{formatTrackingStamp(entry.createdAt)}</p>
                          <p className="mt-1 text-sm font-bold text-slate-900">{entry.event}</p>
                          <p className="mt-1 text-sm text-slate-500">{entry.location}</p>
                          {entry.remark ? <p className="mt-1 text-sm text-slate-600">{entry.remark}</p> : null}
                        </div>
                        <div className="relative">
                          <button type="button" aria-label="Tracking actions" onClick={() => setTrackingMenuId((current) => current === entry.id ? "" : entry.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                          </button>
                          {trackingMenuId === entry.id && (
                            <>
                              <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setTrackingMenuId("")} />
                              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-sm">
                                <button type="button" onClick={() => openTrackingModal(entry)} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50">Edit</button>
                                <button type="button" onClick={() => deleteTrackingUpdate(entry)} className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No tracking updates yet. Add the first shipment event.</p>
            )}
          </div>
        </section>

        {trackingModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>{editingTrackingId ? "Edit Tracking Update" : "Add Tracking Update"}</h3>
              </div>
              <form onSubmit={saveTrackingUpdate} className="space-y-4 p-5">
                <label className="block text-xs font-semibold text-slate-700">Event *
                  <select required value={trackingForm.event} onChange={(e) => setTrackingForm((previous) => ({ ...previous, event: e.target.value }))} className="mt-1.5 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white">
                    <option value="">Select event</option>
                    {TRACKING_EVENTS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">Location *
                  <input required value={trackingForm.location} onChange={(e) => setTrackingForm((previous) => ({ ...previous, location: e.target.value }))} placeholder="Baddi_Barotiwala_L (Himachal Pradesh)" className="mt-1.5 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Remark
                  <textarea rows="3" value={trackingForm.remark} onChange={(e) => setTrackingForm((previous) => ({ ...previous, remark: e.target.value }))} placeholder="Optional note" className="mt-1.5 min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" />
                </label>
                {trackingError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{trackingError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeTrackingModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                  <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Update</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DetailCard title="Consignor"><DetailGrid items={[["Name", consignor.name], ["Mobile", consignor.mobile], ["GST", consignor.gst], ["Pincode", consignor.pincode], ["City", consignor.city], ["State", consignor.state], ["Address", consignor.address]]} /></DetailCard>
          <DetailCard title="Consignee"><DetailGrid items={[["Name", consignee.name], ["Mobile", consignee.mobile], ["GST", consignee.gst], ["Pincode", consignee.pincode], ["City", consignee.city], ["State", consignee.state], ["Address", consignee.address]]} /></DetailCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <DetailCard title="Goods">
            <DetailGrid items={[["Articles", goods.articles], ["Package Type", goods.packageType], ["Pieces", goods.packages], ["Private Mark", goods.privateMark], ["Invoice No", goods.invoiceNumber], ["E-Way Bill", goods.ewayBillNumber], ["Risk", goods.riskType], ["Declared Value", money(goods.declaredValue)], ["Actual Weight", `${Number(goods.actualWeight || 0).toFixed(2)} KG`], ["Charged Weight", `${Number(goods.chargedWeight || 0).toFixed(2)} KG`]]} />
            {goods.description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600"><b>Description:</b> {goods.description}</p>}
          </DetailCard>
          <DetailCard title="Dimensions">
            <DetailGrid items={[["Length", dimensions.length], ["Width", dimensions.width], ["Height", dimensions.height], ["Unit", String(dimensions.unit || "").toUpperCase()], ["Pieces", dimensions.pieces], ["Cubic Feet", Number(dimensions.cubicFeet || 0).toFixed(2)], ["CBM", Number(dimensions.cbm || 0).toFixed(4)], ["Volumetric Weight", `${Number(dimensions.volumetricWeight || 0).toFixed(2)} KG`]]} />
          </DetailCard>
        </div>

        <div className="mt-4">
          <DetailCard title="Charges">
            <div className="grid gap-x-8 sm:grid-cols-2">
              {[["Freight", charges.freight], ["Hamali", charges.hamali], ["Door Delivery", charges.doorDelivery], ["Local Cartage Charges", charges.localCartageCharges], ["Self Builty Charge", charges.selfBuiltyCharge], ["Builty Charge", charges.builtyCharge], ["To Pay Extra Charge", charges.toPayBuiltyCharge], ["Other Charges", charges.otherCharges], ["GST on Freight", charges.gstOnFreight]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-600">{label}</span><strong className="text-slate-900">{money(value)}</strong></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-4 text-white" style={{ backgroundColor: NAVY }}><span className="text-sm font-bold uppercase tracking-[0.12em]">Grand Total</span><strong className="text-2xl" style={{ color: ORANGE }}>{money(booking.grandTotal)}</strong></div>
          </DetailCard>
        </div>
      </div>
    </main>

    <section className="lr-print-only hidden print:block" aria-label="Assam Goods Carrier Lorry Receipt">
      <div className="lr-paper">
        <div className="lr-header">
          <div className="lr-brand"><img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" className="lr-logo-img" /><div><strong>ASSAM GOODS CARRIER</strong><span>SAFE • RELIABLE • ON TIME</span></div></div>
          <div className="lr-title"><strong>LORRY RECEIPT</strong><span>Goods Consignment Note</span><b>ORIGINAL</b></div>
          <div className="lr-reference"><div><span>LR NO.</span><strong>{booking.lrNumber}</strong></div><LrBarcode value={booking.lrNumber} /><div className="lr-date-time"><span>DATE <b>{text(booking.date)}</b></span><span>TIME <b>{text(booking.time)}</b></span></div></div>
        </div>

        <div className="lr-route-strip"><div><span>BOOKING BRANCH</span><b>{text(route.bookingBranch)}</b></div><div><span>DELIVERY BRANCH</span><b>{text(route.deliveryBranch)}</b></div><div><span>DELIVERY AT</span><b>{text(route.deliveryAt)}</b></div><strong className={`lr-payment-badge ${booking.paymentType}`}>{paymentLabel(booking.paymentType)}</strong></div>

        <div className="lr-parties-print">
          <div className="lr-print-box"><h3>CONSIGNOR</h3><p><b>Name</b><span>{text(consignor.name)}</span></p><p><b>Mobile</b><span>{text(consignor.mobile)}</span><b>GST</b><span>{text(consignor.gst)}</span></p><p><b>Address</b><span>{text(consignor.address)}</span></p></div>
          <div className="lr-print-box"><h3>CONSIGNEE</h3><p><b>Name</b><span>{text(consignee.name)}</span></p><p><b>Mobile</b><span>{text(consignee.mobile)}</span><b>GST</b><span>{text(consignee.gst)}</span></p><p><b>Address</b><span>{text(consignee.address)}</span></p></div>
        </div>

        <div className="lr-print-box lr-goods-print"><h3>GOODS DETAILS</h3><table><thead><tr><th>Articles</th><th>Package Type</th><th>Pieces</th><th>Private Mark</th><th>Invoice Number</th><th>E-Way Bill</th></tr></thead><tbody><tr><td>{text(goods.articles)}</td><td>{text(goods.packageType)}</td><td>{text(goods.packages)}</td><td>{text(goods.privateMark)}</td><td>{text(goods.invoiceNumber)}</td><td>{text(goods.ewayBillNumber)}</td></tr></tbody></table><div className="lr-goods-foot"><span><b>Risk Type:</b> {text(goods.riskType).replace("_risk", "")}</span><span><b>Declared Value:</b> {money(goods.declaredValue)}</span></div></div>

        <div className="lr-print-columns">
          <div className="lr-print-box"><h3>WEIGHT &amp; DIMENSIONS</h3><div className="lr-measures"><span><b>Length</b>{text(dimensions.length)}</span><span><b>Width</b>{text(dimensions.width)}</span><span><b>Height</b>{text(dimensions.height)}</span><span><b>Unit</b>{String(dimensions.unit || "").toUpperCase()}</span><span><b>Pieces</b>{text(dimensions.pieces)}</span><span><b>Cubic Feet</b>{Number(dimensions.cubicFeet || 0).toFixed(2)}</span><span><b>CBM</b>{Number(dimensions.cbm || 0).toFixed(4)}</span><span><b>Volumetric Weight</b>{Number(dimensions.volumetricWeight || 0).toFixed(2)} KG</span></div><div className="lr-weight-print"><span><b>Actual Weight</b>{Number(goods.actualWeight || 0).toFixed(2)} KG</span><span><b>Charged Weight (Auto)</b>{Number(goods.chargedWeight || 0).toFixed(2)} KG</span></div><small className="lr-charge-note">Charged by {Number(goods.volumetricWeight || 0) > Number(goods.actualWeight || 0) ? "Volumetric Weight" : "Actual Weight"}</small></div>
          <div className="lr-print-box lr-freight-print"><h3>FREIGHT BREAKUP</h3><table><thead><tr><th>Particular</th><th>Amount</th></tr></thead><tbody><tr><td>Freight</td><td>{money(charges.freight)}</td></tr><tr><td>Hamali</td><td>{money(charges.hamali)}</td></tr><tr><td>Door Delivery</td><td>{money(charges.doorDelivery)}</td></tr><tr><td>Local Cartage Charges</td><td>{money(charges.localCartageCharges)}</td></tr><tr><td>Self Builty Charge</td><td>{money(charges.selfBuiltyCharge)}</td></tr><tr><td>Builty Charge</td><td><b>₹150.00</b></td></tr>{booking.paymentType === "to_pay" && <tr><td>To Pay Extra Charge</td><td><b>₹100.00</b></td></tr>}<tr><td>Other Charges</td><td>{money(charges.otherCharges)}</td></tr><tr><td>GST on Freight</td><td>{money(charges.gstOnFreight)}</td></tr></tbody></table><div className="lr-grand-total"><span>GRAND TOTAL</span><strong>{money(booking.grandTotal)}</strong></div></div>
        </div>

        <div className="lr-signature-row"><div>Booking Clerk</div><div>Receiver</div><div>Customer</div></div>
        <div className="lr-print-footer">Assam Goods Carrier <span>•</span> Subject to Company Rules.</div>
      </div>
    </section>
    <style jsx global>{`
      .lr-print-only { display: none; }
      @media print {
        @page { size: A4 landscape; margin: 8mm; }
        html, body { background: #fff !important; }
        .sidebar, header, .booking-form, .sticky-action-bar, .booking-details-screen { display: none !important; }
        .lr-print-only { display: block !important; width: 100%; color: #0B1F33; font-family: Arial, Helvetica, sans-serif; }
        .lr-paper { box-sizing: border-box; width: 100%; height: 194mm; overflow: hidden; border: 1px solid #0B1F33; padding: 3mm; page-break-inside: avoid; }
        .lr-header { display: grid; grid-template-columns: 1.35fr 1fr 1.25fr; border-bottom: 1px solid #0B1F33; }
        .lr-brand, .lr-title, .lr-reference { min-height: 26mm; padding: 2mm; border-right: 1px solid #94a3b8; }
        .lr-reference { border-right: 0; display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 2mm; }
        .lr-logo-img { height: 14mm; width: auto; object-fit: contain; }
        .lr-logo-box { display: none; }
        .lr-brand { display: flex; align-items: center; gap: 3mm; }
        .lr-brand strong { display: block; font-size: 13pt; letter-spacing: 0.3mm; }
        .lr-brand span, .lr-title span { display: block; margin-top: 1mm; color: #64748b; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.8mm; }
        .lr-title { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .lr-title strong { font-size: 17pt; letter-spacing: 1mm; }
        .lr-title b { margin-top: 2mm; border: 1px solid #F97316; padding: 1mm 4mm; color: #F97316; font-size: 6.5pt; letter-spacing: 0.8mm; }
        .lr-reference > div:first-child > span, .lr-date-time span { display: block; color: #64748b; font-size: 5.5pt; font-weight: 700; letter-spacing: 0.5mm; }
        .lr-reference > div:first-child strong { display: block; margin-top: 1mm; color: #F97316; font-size: 12pt; letter-spacing: 0.5mm; }
        .lr-barcode-box { display: flex; flex-direction: column; align-items: flex-start; gap: 0.7mm; overflow: visible; }
        .lr-barcode-box svg { display: block; width: 180px; height: 42px; background: #fff; }
        .lr-barcode-box span { font-size: 6pt; letter-spacing: 0.8mm; }
        .lr-date-time { grid-column: 1 / -1; display: flex; gap: 7mm; align-items: end; }
        .lr-date-time b { display: block; margin-top: 0.7mm; color: #0B1F33; font-size: 7pt; letter-spacing: 0; }
        .lr-route-strip { display: grid; grid-template-columns: 1fr 1fr 1.4fr 0.55fr; border: 1px solid #0B1F33; border-top: 0; }
        .lr-route-strip > div, .lr-route-strip > strong { min-height: 12mm; padding: 1.5mm 2mm; border-right: 1px solid #cbd5e1; font-size: 7.5pt; }
        .lr-route-strip > strong { display: flex; align-items: center; justify-content: center; border-right: 0; font-size: 7pt; }
        .lr-route-strip span { display: block; margin-bottom: 1mm; color: #64748b; font-size: 5.5pt; font-weight: 700; letter-spacing: 0.5mm; }
        .lr-payment-badge { border: 2px solid #F97316; color: #F97316; }
        .lr-payment-badge.paid { border-color: #15803d; color: #15803d; }
        .lr-payment-badge.tbb { border-color: #0B1F33; color: #0B1F33; }
        .lr-parties-print, .lr-print-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm; }
        .lr-print-box { overflow: hidden; border: 1px solid #0B1F33; }
        .lr-print-box h3 { margin: 0; padding: 1.2mm 2mm; background: #0B1F33; color: #fff; font-size: 7pt; letter-spacing: 0.7mm; }
        .lr-print-box p { display: grid; grid-template-columns: 18mm 1fr; gap: 2mm; margin: 0; min-height: 6mm; padding: 1mm 2mm; border-bottom: 1px solid #e2e8f0; font-size: 7pt; }
        .lr-print-box p:last-child { border-bottom: 0; }
        .lr-print-box p b { color: #64748b; font-size: 6pt; text-transform: uppercase; }
        .lr-goods-print { margin-top: 2mm; }
        .lr-goods-print table, .lr-freight-print table { width: 100%; border-collapse: collapse; font-size: 7pt; }
        .lr-goods-print th, .lr-goods-print td, .lr-freight-print th, .lr-freight-print td { border: 1px solid #cbd5e1; padding: 1.3mm 1.5mm; text-align: left; }
        .lr-goods-print th, .lr-freight-print th { background: #e2e8f0; color: #0B1F33; font-size: 6pt; letter-spacing: 0.3mm; }
        .lr-goods-print th:not(:first-child), .lr-goods-print td:not(:first-child), .lr-freight-print td:last-child { text-align: right; }
        .lr-goods-foot { display: flex; justify-content: flex-end; gap: 12mm; padding: 1.5mm 2mm; font-size: 7pt; }
        .lr-detail-grid { grid-template-columns: 1.15fr 0.85fr; }
        .lr-measures { display: grid; grid-template-columns: repeat(4, 1fr); }
        .lr-measures span { display: flex; flex-direction: column; gap: 1mm; min-height: 8mm; padding: 1.4mm 2mm; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; font-size: 7pt; }
        .lr-measures b, .lr-weight-print b { color: #64748b; font-size: 5.5pt; text-transform: uppercase; }
        .lr-weight-print { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; padding: 1.5mm 2mm; font-size: 8pt; }
        .lr-weight-print span { display: flex; flex-direction: column; gap: 1mm; }
        .lr-charge-note { display: block; padding: 0 2mm 1.5mm; color: #F97316; font-size: 6pt; font-weight: 700; }
        .lr-freight-print td:last-child { width: 26mm; font-weight: 600; }
        .lr-grand-total { display: flex; align-items: center; justify-content: space-between; margin: 2mm; padding: 2mm 3mm; background: #F97316; color: #fff; }
        .lr-grand-total span { font-size: 9pt; font-weight: 800; letter-spacing: 0.8mm; }
        .lr-grand-total strong { font-size: 15pt; }
        .lr-signature-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15mm; margin: 5mm 3mm 0; }
        .lr-signature-row div { padding-top: 7mm; border-top: 1px solid #64748b; text-align: center; color: #64748b; font-size: 6.5pt; }
        .lr-print-footer { margin-top: 3mm; border-top: 1px solid #cbd5e1; padding-top: 1.5mm; text-align: center; color: #64748b; font-size: 6pt; }
      }
    `}</style>
    </>
    </AppLayout>
  );
}
