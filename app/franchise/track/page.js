"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const text = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "—";

function formatStamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FranchiseTrackPage() {
  const [lrNumber, setLrNumber] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleTrack = async (event) => {
    event.preventDefault();
    const key = lrNumber.trim();
    if (!key) {
      setError("Enter an LR number to track.");
      setBooking(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    setBooking(null);

    try {
      const res = await fetch(`/api/franchise/bookings/${encodeURIComponent(key)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking not found");
      }
      setBooking(data.booking);
    } catch (err) {
      setError(err.message === "Booking not found" ? "Booking not found" : err.message || "Tracking failed");
    } finally {
      setLoading(false);
    }
  };

  const from =
    booking?.route?.bookingBranch || booking?.route?.from || "—";
  const to =
    booking?.route?.deliveryBranch || booking?.route?.toStation || booking?.route?.to || "—";
  const history = Array.isArray(booking?.trackingHistory) ? booking.trackingHistory : [];

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            Tracking
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
            Track Shipment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter an LR number from your franchise bookings.
          </p>
        </div>

        <form
          onSubmit={handleTrack}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <input
            className={inputClass}
            placeholder="Enter LR Number"
            value={lrNumber}
            onChange={(e) => setLrNumber(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ORANGE }}
          >
            <Search className="h-4 w-4" />
            {loading ? "Tracking…" : "Track"}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {booking && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">LR Number</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: NAVY }}>
                    {text(booking.lrNumber)}
                  </h2>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
                  {text(booking.status)}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Route</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {from} → {to}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Date Created</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatStamp(booking.createdAt || booking.date)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Consignor</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{text(booking.consignor?.name)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Consignee</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{text(booking.consignee?.name)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
                Status Timeline
              </h3>
              {history.length ? (
                <ol className="relative mt-4 ml-3 space-y-0 border-l border-slate-200 pl-6">
                  {history.map((entry, index) => (
                    <li key={`${entry.id || entry.event || "evt"}-${index}`} className="relative py-3">
                      <span className="absolute -left-[1.9rem] flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                        <MapPin className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[11px] font-medium text-gray-400">
                        {formatStamp(entry.createdAt || entry.timestamp)}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: NAVY }}>
                        {text(entry.event || entry.status)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[entry.location || entry.branch, entry.remark || entry.note]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No tracking updates yet.</p>
              )}
            </section>
          </div>
        )}

        {!loading && searched && !booking && !error && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>
              Booking not found
            </p>
          </div>
        )}
      </div>
    </FranchiseLayout>
  );
}
