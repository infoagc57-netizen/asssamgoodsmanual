"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const todayIso = () => new Date().toISOString().slice(0, 10);

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function NewManifestPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    manifestNumber: "",
    date: todayIso(),
    fromBranch: "",
    toBranch: "",
    truckNumber: "",
    driverName: "",
    driverMobile: "",
    transporterName: "",
    notes: "",
  });

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings?notInManifest=1&limit=2000");
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
        const res = await fetch("/api/manifests/next-number");
        const data = await res.json();
        if (res.ok && data.manifestNumber) {
          setForm((prev) => ({ ...prev, manifestNumber: data.manifestNumber }));
        }
      } catch {
        /* keep empty */
      }
    })();
  }, [loadBookings]);

  const branchOptions = useMemo(() => {
    const from = new Set();
    const to = new Set();
    bookings.forEach((b) => {
      if (b.route?.bookingBranch) from.add(b.route.bookingBranch);
      if (b.route?.deliveryBranch) to.add(b.route.deliveryBranch);
    });
    return {
      from: [...from].sort(),
      to: [...to].sort(),
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const from = booking.route?.bookingBranch || "";
      const to = booking.route?.deliveryBranch || "";
      const bookingDate = booking.date || "";
      if (fromFilter && from !== fromFilter) return false;
      if (toFilter && to !== toFilter) return false;
      if (dateFrom && bookingDate && bookingDate < dateFrom) return false;
      if (dateTo && bookingDate && bookingDate > dateTo) return false;
      if (!q) return true;
      const consignee = booking.consignee?.name || "";
      return (
        String(booking.lrNumber || "").toLowerCase().includes(q)
        || consignee.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, fromFilter, toFilter, dateFrom, dateTo]);

  const selectedBookings = useMemo(
    () => bookings.filter((b) => selected.includes(b.lrNumber)),
    [bookings, selected],
  );

  const summary = useMemo(() => selectedBookings.reduce(
    (totals, booking) => {
      totals.count += 1;
      totals.packages += Number(booking.goods?.packages || 0);
      totals.weight += Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0);
      totals.amount += Number(booking.grandTotal || 0);
      return totals;
    },
    { count: 0, packages: 0, weight: 0, amount: 0 },
  ), [selectedBookings]);

  useEffect(() => {
    if (!selectedBookings.length) return;
    const fromBranches = [...new Set(selectedBookings.map((b) => b.route?.bookingBranch).filter(Boolean))];
    const toBranches = [...new Set(selectedBookings.map((b) => b.route?.deliveryBranch).filter(Boolean))];
    setForm((prev) => ({
      ...prev,
      fromBranch: fromBranches.length === 1 ? fromBranches[0] : prev.fromBranch,
      toBranch: toBranches.length === 1 ? toBranches[0] : prev.toBranch,
    }));
  }, [selectedBookings]);

  const toggleSelect = (lrNumber) => {
    setSelected((prev) => (prev.includes(lrNumber) ? prev.filter((lr) => lr !== lrNumber) : [...prev, lrNumber]));
  };

  const toggleSelectAll = () => {
    const visibleLrs = filteredBookings.map((b) => b.lrNumber);
    const allSelected = visibleLrs.length > 0 && visibleLrs.every((lr) => selected.includes(lr));
    if (allSelected) {
      setSelected((prev) => prev.filter((lr) => !visibleLrs.includes(lr)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...visibleLrs])]);
    }
  };

  const updateForm = (field) => (event) => {
    const value = field === "driverMobile"
      ? event.target.value.replace(/\D/g, "").slice(0, 10)
      : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    if (!selected.length) {
      setError("Select at least one booking.");
      return;
    }
    if (!form.fromBranch.trim() || !form.toBranch.trim()) {
      setError("From and To branch are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lrNumbers: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create manifest");
      const id = data.manifest?.id || data.manifest?.manifestNumber;
      router.push(`/manifests/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err.message || "Failed to create manifest");
    } finally {
      setSubmitting(false);
    }
  };

  const allVisibleSelected = filteredBookings.length > 0
    && filteredBookings.every((b) => selected.includes(b.lrNumber));

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <Link href="/manifests" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Manifests / New
            </Link>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Create Manifest</h1>
          </div>

          <form onSubmit={handleCreate} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Available bookings</h2>
              <p className="mt-1 text-xs text-slate-500">Bookings not assigned to any manifest.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search LR or consignee"
                  className={inputClass}
                />
                <select value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} className={inputClass}>
                  <option value="">From branch (all)</option>
                  {branchOptions.from.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <select value={toFilter} onChange={(e) => setToFilter(e.target.value)} className={inputClass}>
                  <option value="">To branch (all)</option>
                  {branchOptions.to.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all visible"
                        />
                      </th>
                      {["LR No", "Consignee", "From", "To", "Pkgs", "WT", "Status"].map((heading) => (
                        <th key={heading} className="px-3 py-2">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingBookings ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-10 text-center text-slate-500">Loading bookings…</td>
                      </tr>
                    ) : filteredBookings.length ? (
                      filteredBookings.map((booking) => (
                        <tr key={booking.lrNumber} className="hover:bg-orange-50/20">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.includes(booking.lrNumber)}
                              onChange={() => toggleSelect(booking.lrNumber)}
                            />
                          </td>
                          <td className="px-3 py-2 font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                          <td className="px-3 py-2 text-slate-700">{booking.consignee?.name || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{booking.route?.bookingBranch || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{booking.route?.deliveryBranch || "—"}</td>
                          <td className="px-3 py-2">{booking.goods?.packages || 0}</td>
                          <td className="px-3 py-2">
                            {Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} kg
                          </td>
                          <td className="px-3 py-2 text-slate-600">{booking.status || "Booked"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-3 py-10 text-center text-slate-500">No available bookings match filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Manifest details</h2>
                <div className="mt-4 space-y-3">
                  {[
                    ["Manifest Number", "manifestNumber", "text"],
                    ["Date", "date", "date"],
                    ["From Branch", "fromBranch", "text"],
                    ["To Branch", "toBranch", "text"],
                    ["Truck Number", "truckNumber", "text"],
                    ["Driver Name", "driverName", "text"],
                    ["Driver Mobile", "driverMobile", "tel"],
                    ["Transporter Name", "transporterName", "text"],
                  ].map(([label, field, type]) => (
                    <label key={field} className="block text-xs font-semibold text-slate-700">
                      {label}
                      <input
                        type={type}
                        value={form[field]}
                        onChange={updateForm(field)}
                        className={`${inputClass} mt-1.5`}
                        required={field === "fromBranch" || field === "toBranch"}
                      />
                    </label>
                  ))}
                  <label className="block text-xs font-semibold text-slate-700">
                    Notes (optional)
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={updateForm("notes")}
                      className={`${textareaClass} mt-1.5`}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Summary</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-600">Selected</dt><dd className="font-semibold">{summary.count} bookings</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-600">Total packages</dt><dd className="font-semibold">{summary.packages}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-600">Total weight</dt><dd className="font-semibold">{summary.weight.toFixed(2)} kg</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-600">Total amount</dt><dd className="font-semibold">{money(summary.amount)}</dd></div>
                </dl>
              </section>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <div className="flex gap-2">
                <Link href="/manifests" className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || selected.length === 0}
                  className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: ORANGE }}
                >
                  {submitting ? "Creating…" : "Create Manifest"}
                </button>
              </div>
            </aside>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
