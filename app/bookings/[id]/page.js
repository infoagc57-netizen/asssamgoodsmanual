"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppLayout from "../../../components/layout/AppLayout";
import LrPrintLayout from "@/components/bookings/LrPrintLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const paymentLabel = (value) => value === "to_pay" ? "TO PAY" : value === "paid" ? "PAID" : "TBB";
const deliveryTypeLabel = (value) => (value === "godown" ? "GODOWN DELIVERY" : "DOOR DELIVERY");
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const text = (value) => value || "-";
const printText = (value, fallback = "-") => (
  value !== undefined && value !== null && String(value).trim() !== "" ? value : fallback
);

function bookingToPrintForm(booking) {
  const route = booking.route || {};
  const consignor = booking.consignor || {};
  const consignee = booking.consignee || {};
  const goods = booking.goods || {};
  const dimensions = booking.dimensions || {};
  return {
    bookingDate: booking.date || "",
    bookingTime: booking.time || "",
    bookingBranch: route.bookingBranch || "",
    deliveryBranch: route.deliveryBranch || "",
    deliveryAt: route.deliveryAt || "",
    godownAddress: route.godownAddress || (booking.deliveryType === "godown" ? route.deliveryAt : "") || "",
    godownMobile: route.godownMobile || "",
    consignorName: consignor.name || "",
    consignorMobile: consignor.mobile || "",
    consignorGst: consignor.gst || "",
    consignorPincode: consignor.pincode || "",
    consignorCity: consignor.city || "",
    consignorState: consignor.state || "",
    consignorAddress: consignor.address || "",
    consigneeName: consignee.name || "",
    consigneeMobile: consignee.mobile || "",
    consigneeGst: consignee.gst || "",
    consigneeIdType: consignee.idType || (consignee.gst ? "GST" : "GST"),
    consigneeIdNumber: consignee.idNumber || consignee.gst || "",
    consigneePincode: consignee.pincode || "",
    consigneeCity: consignee.city || "",
    consigneeState: consignee.state || "",
    consigneeAddress: consignee.address || "",
    articles: goods.articles || "",
    packageType: goods.packageType || "",
    noOfPackages: goods.packages ?? "",
    privateMark: goods.privateMark || "",
    goodsDescription: goods.description || "",
    invoiceNumber: goods.invoiceNumber || "",
    ewayBillNumber: goods.ewayBillNumber || "",
    riskType: goods.riskType || "",
    declaredValue: goods.declaredValue ?? "",
    codAmount: goods.codAmount ?? "",
    dimensionLength: dimensions.length ?? "",
    dimensionWidth: dimensions.width ?? "",
    dimensionHeight: dimensions.height ?? "",
    dimensionUnit: dimensions.unit || "",
    dimensionPieces: dimensions.pieces ?? "",
    deliveryType: booking.deliveryType || "door",
    applyGst: booking.charges?.applyGst ?? Number(booking.charges?.gstOnFreight) > 0,
    gstRate: booking.charges?.gstRate ?? 5,
  };
}

function chargeCompute(charges) {
  return (field) => Number(charges?.[field] || 0);
}

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

const CAN_DELETE_ROLES = new Set(["admin", "manager"]);

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountCustomerId, setAccountCustomerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmLr, setDeleteConfirmLr] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDeleteBooking = CAN_DELETE_ROLES.has(session?.user?.role);

  useEffect(() => {
    let cancelled = false;
    const lrNumber = decodeURIComponent(params?.id || "");

    (async () => {
      try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(lrNumber)}`);
        const data = await response.json();
        const record = response.ok ? data.booking : null;
        if (cancelled) return;

        setBooking(record);
        setTrackingHistory(record?.trackingHistory || []);
        const customers = JSON.parse(window.localStorage.getItem("agc_customers") || "[]");
        const customer = customers.find((item) => item.name.toLowerCase() === record?.consignor?.name?.toLowerCase());
        setAccountCustomerId(customer?.id || "");
        const credits = JSON.parse(window.localStorage.getItem("agc_ledger") || "[]").filter((entry) => entry.customerId === customer?.id && entry.credit > 0).reduce((total, entry) => total + Number(entry.credit || 0), 0);
        const total = Number(record?.grandTotal || 0);
        setPaymentStatus(record?.paymentType === "paid" || credits >= total ? "Paid" : credits > 0 ? "Partial" : "Pending");
      } catch {
        if (!cancelled) setBooking(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading booking...</div>;
  if (!booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Booking not found</h1>
          <p className="mt-2 text-sm text-slate-500">No booking exists for this LR number.</p>
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
  const actualWeight = Number(goods.actualWeight) || 0;
  const chargedWeight = Number(goods.chargedWeight) || 0;
  const volumetricWeight = Number(dimensions.volumetricWeight) || 0;
  const cubicFeet = Number(dimensions.cubicFeet) || 0;
  const cbm = Number(dimensions.cbm) || 0;
  const chargedByVolumetricWeight = volumetricWeight > actualWeight;
  const builtyCharge = Number(charges.builtyCharge) || 150;
  const toPayBuiltyCharge = Number(charges.toPayBuiltyCharge) || (booking.paymentType === "to_pay" ? 100 : 0);
  const codHandlingFee = Number(charges.codHandlingFee) || 0;

  const openDeleteModal = () => {
    setDeleteConfirmLr("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteConfirmLr("");
    setDeleteError("");
  };

  const handleDeleteBooking = async () => {
    if (deleteConfirmLr.trim() !== String(booking.lrNumber).trim()) {
      setDeleteError("LR number does not match. Type the exact LR number to confirm.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(booking.lrNumber)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete booking");
      }
      sessionStorage.setItem("bookings_toast", data.message || "Booking deleted successfully");
      router.push("/bookings");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete booking");
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
    <>
    <main className="booking-details-screen screen-only min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/bookings" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-orange-600">Bookings / Details</a>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: NAVY }}>LR {booking.lrNumber}</h1>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{booking.status || "Booked"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/bookings" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</a>
            <a
              href={`/bookings/new?edit=true&lr=${encodeURIComponent(booking.lrNumber)}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </a>
            <a
              href={`/bookings/${encodeURIComponent(booking.lrNumber)}/sticker`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print Sticker
            </a>
            <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Print LR</button>
            {canDeleteBooking && (
              <button
                type="button"
                onClick={openDeleteModal}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
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
              ["Delivery Type", deliveryTypeLabel(booking.deliveryType)],
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
            <a href="/tracking-updates" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Add update
            </a>
          </div>
          <div className="p-5">
            {orderedTracking.length ? (
              <ol className="relative ml-3 border-l border-slate-200 pl-8">
                {orderedTracking.map((entry, index) => {
                  const tone = trackingColors[trackingTone(entry.event)] || trackingColors.transit;
                  const entryKey = entry._id?.toString() || entry.id || `${entry.event}-${entry.timestamp || index}-${index}`;
                  return (
                    <li key={entryKey} className="relative pb-8 last:pb-0">
                      <span className={`absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full ${tone.bg} ${tone.fg}`}>
                        <TrackingIcon event={entry.event} />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-slate-400">{formatTrackingStamp(entry.createdAt || entry.timestamp)}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{entry.event || entry.status}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.location || entry.branch}</p>
                        {(entry.remark || entry.note) ? <p className="mt-1 text-sm text-slate-600">{entry.remark || entry.note}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No tracking updates yet.{" "}
                <a href="/tracking-updates" className="font-semibold text-orange-600 hover:underline">Add one from Tracking Updates</a>.
              </p>
            )}
          </div>
        </section>

        {deleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={closeDeleteModal} aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-booking-title"
              className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h3 id="delete-booking-title" className="text-lg font-bold text-red-700">Delete booking</h3>
              <p className="mt-2 text-sm text-slate-600">
                This permanently removes LR <strong>{booking.lrNumber}</strong> and cannot be undone.
              </p>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Type LR number to confirm
                <input
                  type="text"
                  value={deleteConfirmLr}
                  onChange={(e) => setDeleteConfirmLr(e.target.value)}
                  placeholder={booking.lrNumber}
                  className="mt-1.5 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
                  autoComplete="off"
                />
              </label>
              {deleteError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBooking}
                  disabled={deleting || deleteConfirmLr.trim() !== String(booking.lrNumber).trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete booking"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DetailCard title="Consignor"><DetailGrid items={[["Name", consignor.name], ["Mobile", consignor.mobile], ["GST", consignor.gst], ["Pincode", consignor.pincode], ["City", consignor.city], ["State", consignor.state], ["Address", consignor.address]]} /></DetailCard>
          <DetailCard title="Consignee"><DetailGrid items={[["Name", consignee.name], ["Mobile", consignee.mobile], ["ID Type", consignee.idType || (consignee.gst ? "GST" : "-")], [consignee.idType === "PAN" ? "PAN" : consignee.idType === "Aadhaar" ? "Aadhaar" : "GSTIN", consignee.idNumber || consignee.gst], ["Pincode", consignee.pincode], ["City", consignee.city], ["State", consignee.state], ["Address", consignee.address]]} /></DetailCard>
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

    <div className="lr-print-section">
      <LrPrintLayout
        lrNumber={booking.lrNumber}
        form={bookingToPrintForm(booking)}
        paymentLabel={paymentLabel(booking.paymentType)}
        deliveryTypeLabel={deliveryTypeLabel(booking.deliveryType)}
        actualWeight={actualWeight}
        chargedWeight={chargedWeight}
        volumetricWeight={volumetricWeight}
        cubicFeet={cubicFeet}
        cbm={cbm}
        chargedByVolumetricWeight={chargedByVolumetricWeight}
        builtyCharge={builtyCharge}
        toPayBuiltyCharge={toPayBuiltyCharge}
        codHandlingFee={codHandlingFee}
        grandTotal={Number(booking.grandTotal) || 0}
        compute={chargeCompute(charges)}
        printText={printText}
      />
    </div>
    </>
    </AppLayout>
  );
}
