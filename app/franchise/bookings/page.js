"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Package } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const FILTERS = ["All", "Booked", "In Transit", "Delivered", "Cancelled"];

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadgeClass(status) {
  const value = String(status || "").toLowerCase().replace(/_/g, " ");
  if (value === "booked") return "bg-blue-100 text-blue-700";
  if (value === "in transit") return "bg-orange-100 text-orange-700";
  if (value === "delivered") return "bg-green-100 text-green-700";
  if (value === "cancelled") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase().replace(/_/g, " ").trim();
}

function matchesFilter(bookingStatus, filter) {
  if (filter === "All") return true;
  return normalizeStatus(bookingStatus) === normalizeStatus(filter);
}

function routeLabel(route = {}) {
  const from = route.from || route.bookingBranch || "—";
  const to = route.to || route.toStation || route.deliveryBranch || "—";
  return `${from} → ${to}`;
}

export default function FranchiseBookingsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filter !== "All") params.set("status", filter);
      const res = await fetch(`/api/franchise/bookings?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      setBookings([]);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadBookings();
    } else if (sessionStatus !== "loading") {
      setLoading(false);
    }
  }, [sessionStatus, loadBookings]);

  const visibleBookings = useMemo(
    () => bookings.filter((b) => matchesFilter(b.status, filter)),
    [bookings, filter],
  );

  return (
    <FranchiseLayout>
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: NAVY }}>
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-slate-500">All bookings created by you</p>
          </div>
          <Link
            href="/franchise/bookings/new"
            className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: ORANGE }}
          >
            + New Booking
          </Link>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  active ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={active ? { backgroundColor: NAVY } : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        {loading || sessionStatus === "loading" ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-slate-300" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold text-slate-700">No bookings yet</p>
            <p className="mt-1 text-sm text-slate-500">Create your first booking to get started</p>
            <Link
              href="/franchise/bookings/new"
              className="mt-5 inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              + New Booking
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((booking) => {
              const id = booking.id || booking._id;
              const freight =
                booking.grandTotal ??
                booking.charges?.freight ??
                0;
              return (
                <article
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/franchise/bookings/${id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/franchise/bookings/${id}`);
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold" style={{ color: NAVY }}>
                          {booking.lrNumber}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(booking.status)}`}
                        >
                          {String(booking.status || "Booked").replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{routeLabel(booking.route)}</p>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {booking.consignor?.name || "—"} → {booking.consignee?.name || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.date || "—"}
                        {" · "}
                        {booking.goods?.weight != null ? `${booking.goods.weight} kg` : "— kg"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="text-lg font-bold tabular-nums" style={{ color: NAVY }}>
                        {money(freight)}
                      </p>
                      <Link
                        href={`/franchise/bookings/${id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </FranchiseLayout>
  );
}
