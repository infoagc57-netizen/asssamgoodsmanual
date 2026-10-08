"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const text = (value) => (value !== undefined && value !== null && String(value).trim() !== "" ? value : "—");

export default function FranchiseBookingDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/franchise/bookings/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load booking");
        if (!cancelled) setBooking(data.booking);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load booking");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ORANGE }}>
              Franchise Booking
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>
              {loading ? "Loading…" : booking?.lrNumber || "Booking"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.status ? String(booking.status).replace(/_/g, " ") : "Booking details"}
            </p>
          </div>
          <Link
            href="/franchise/bookings"
            className="inline-flex h-[38px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to My Bookings
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : booking ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
                Summary
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["LR Number", booking.lrNumber],
                  ["Date", booking.date],
                  ["Payment", booking.paymentType],
                  ["Grand Total", money(booking.grandTotal)],
                  ["Markup", money(booking.markup)],
                  ["Base Freight", money(booking.baseFreight)],
                  ["From", booking.route?.bookingBranch || booking.route?.from],
                  ["To", booking.route?.deliveryBranch || booking.route?.to || booking.route?.toStation],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{text(value)}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
                  Consignor
                </h2>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p className="font-semibold" style={{ color: NAVY }}>{text(booking.consignor?.name)}</p>
                  <p>{text(booking.consignor?.mobile || booking.consignor?.phone)}</p>
                  <p>{text(booking.consignor?.gst)}</p>
                  <p>{text(booking.consignor?.address)}</p>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
                  Consignee
                </h2>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p className="font-semibold" style={{ color: NAVY }}>{text(booking.consignee?.name)}</p>
                  <p>{text(booking.consignee?.mobile || booking.consignee?.phone)}</p>
                  <p>{text(booking.consignee?.gst || booking.consignee?.idNumber)}</p>
                  <p>{text(booking.consignee?.address)}</p>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </FranchiseLayout>
  );
}
