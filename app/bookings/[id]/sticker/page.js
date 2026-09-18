"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function StickerPrintPage() {
  const params = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [autoPrinted, setAutoPrinted] = useState(false);

  const bookingKey = params?.id ? decodeURIComponent(String(params.id)) : "";

  useEffect(() => {
    document.documentElement.classList.add("printing-stickers");
    document.body.classList.add("printing-stickers");
    return () => {
      document.documentElement.classList.remove("printing-stickers");
      document.body.classList.remove("printing-stickers");
    };
  }, []);

  useEffect(() => {
    if (!bookingKey) {
      setError("Booking not found");
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(bookingKey)}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setBooking(data.booking);
      } catch {
        setError("Booking not found");
      }
    };
    fetchBooking();
  }, [bookingKey]);

  useEffect(() => {
    if (booking && !autoPrinted) {
      const t = setTimeout(() => {
        window.print();
        setAutoPrinted(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [booking, autoPrinted]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
          <div className="mt-3">
            <Link href="/bookings" className="text-sm underline">Back to bookings</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading stickers...
      </div>
    );
  }

  const lrNumber = booking.lrNumber;
  const totalBoxes = Math.max(1, Math.floor(Number(booking.goods?.packages || 1)));
  const deliveryRef = booking.lrNumber || booking.shippingRefNo || "—";

  return (
    <div className="sticker-print-root">
      <div className="sticker-toolbar no-print">
        <div className="sticker-toolbar-inner">
          <div>
            <strong>Sticker Print</strong>
            <span className="ml-2 text-sm text-slate-500">
              LR {lrNumber} • {totalBoxes} sticker{totalBoxes > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Print Again
            </button>
            <Link
              href={`/bookings/${encodeURIComponent(lrNumber)}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      <div className="sticker-page">
        {Array.from({ length: totalBoxes }).map((_, i) => (
          <div key={i} className="lr-sticker">
            <div className="lr-sticker-header">
              <div className="lr-sticker-brand-block">
                <img
                  src="/brand/agc-logo.jpg"
                  alt=""
                  className="lr-sticker-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="lr-sticker-brand-text">
                  <span className="lr-sticker-brand">ASSAM GOODS CARRIER</span>
                  <span className="lr-sticker-sub">CARGO &amp; LOGISTICS</span>
                </div>
              </div>
              <div className="lr-sticker-box-badge">
                BOX {i + 1} / {totalBoxes}
              </div>
            </div>

            <div className="lr-sticker-body">
              <div className="lr-sticker-ref-label">DELIVERY REFERENCE NO.</div>
              <div className="lr-sticker-ref-value">{deliveryRef}</div>
            </div>

            <div className="lr-sticker-footer">
              <div className="lr-sticker-addr">
                Plot No. 5A, Industrial Area, Phase-2, Panchkula, Haryana - 134113
              </div>
              <div className="lr-sticker-mobile">Mobile: +91 8847428801</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
