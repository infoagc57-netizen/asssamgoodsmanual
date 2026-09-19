"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

function formatLongDateFromIso(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ManifestsPage() {
  const router = useRouter();
  const [manifests, setManifests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("today");
  const [pickedDate, setPickedDate] = useState(todayIso());
  const [apiMeta, setApiMeta] = useState({ count: 0, filter: "today", date: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeFilter === "pick") {
        if (pickedDate) params.set("date", pickedDate);
      } else {
        params.set("filter", timeFilter);
      }
      const res = await fetch(`/api/manifests?${params.toString()}`);
      const data = await res.json();
      setManifests(res.ok && Array.isArray(data.manifests) ? data.manifests : []);
      setApiMeta({
        count: data.count ?? (data.manifests?.length ?? 0),
        filter: data.filter || timeFilter,
        date: data.date || (timeFilter === "pick" ? pickedDate : null),
      });
    } catch {
      setManifests([]);
      setApiMeta({ count: 0, filter: timeFilter, date: null });
    } finally {
      setLoading(false);
    }
  }, [timeFilter, pickedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return manifests;
    return manifests.filter((row) =>
      [row.manifestNumber, row.truckNumber, row.fromBranch, row.toBranch, row.status]
        .some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [manifests, search]);

  const showingLabel = useMemo(() => {
    const n = visible.length;
    const word = n === 1 ? "manifest" : "manifests";
    if (timeFilter === "today") {
      return `Showing: ${n} ${word} (last 24 hours)`;
    }
    if (timeFilter === "yesterday") {
      return `Showing: ${n} ${word} on ${formatLongDateFromIso(yesterdayIso())}`;
    }
    if (timeFilter === "last7") {
      return `Showing: ${n} ${word} (last 7 days)`;
    }
    if (timeFilter === "pick" && pickedDate) {
      return `Showing: ${n} ${word} on ${formatLongDateFromIso(pickedDate)}`;
    }
    return `Showing: ${n} ${word}`;
  }, [visible.length, timeFilter, pickedDate]);

  const filterButtonClass = (active) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? "text-white shadow-sm"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  const handleDelete = async (manifest) => {
    const key = manifest.id || manifest.manifestNumber;
    if (!window.confirm(`Delete manifest ${manifest.manifestNumber}? Bookings will be unassigned.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/manifests/${encodeURIComponent(key)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (err) {
      window.alert(err.message || "Failed to delete manifest");
    }
  };

  const emptyMessage = useMemo(() => {
    if (timeFilter === "pick" && pickedDate) {
      return `No manifests on ${formatLongDateFromIso(pickedDate)}.`;
    }
    if (timeFilter === "today") return "No manifests in the last 24 hours.";
    if (timeFilter === "yesterday") return `No manifests on ${formatLongDateFromIso(yesterdayIso())}.`;
    if (timeFilter === "last7") return "No manifests in the last 7 days.";
    return "No manifests found for this filter.";
  }, [timeFilter, pickedDate]);

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Manifests</h1>
            </div>
            <Link
              href="/manifests/new"
              className="inline-flex h-[42px] items-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              + New Manifest
            </Link>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTimeFilter("today")}
                className={filterButtonClass(timeFilter === "today")}
                style={timeFilter === "today" ? { backgroundColor: NAVY } : undefined}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("yesterday")}
                className={filterButtonClass(timeFilter === "yesterday")}
                style={timeFilter === "yesterday" ? { backgroundColor: NAVY } : undefined}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("last7")}
                className={filterButtonClass(timeFilter === "last7")}
                style={timeFilter === "last7" ? { backgroundColor: NAVY } : undefined}
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("pick")}
                className={filterButtonClass(timeFilter === "pick")}
                style={timeFilter === "pick" ? { backgroundColor: NAVY } : undefined}
              >
                Pick date
              </button>
              {timeFilter === "pick" && (
                <input
                  type="date"
                  value={pickedDate}
                  onChange={(e) => setPickedDate(e.target.value)}
                  className="h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white"
                  aria-label="Pick manifest date"
                />
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">{showingLabel}</p>
            {!loading && apiMeta.count !== visible.length && search.trim() && (
              <p className="mt-1 text-xs text-slate-500">
                {apiMeta.count} in date range; {visible.length} match search.
              </p>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search manifest, truck, route, status"
              className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Manifest No", "Date", "Truck No", "From → To", "Total LR", "Total Pkgs", "Total WT", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-500">Loading manifests…</td>
                    </tr>
                  ) : visible.length ? (
                    visible.map((row) => (
                      <tr key={row.id || row.manifestNumber} className="hover:bg-orange-50/30">
                        <td className="px-4 py-4 text-sm font-bold" style={{ color: NAVY }}>
                          <Link href={`/manifests/${encodeURIComponent(row.id || row.manifestNumber)}`} className="hover:text-orange-600">
                            {row.manifestNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{formatDate(row.date || row.createdAt)}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{row.truckNumber || "—"}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {row.fromBranch || "—"} → {row.toBranch || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">{row.totalBookings ?? row.lrNumbers?.length ?? 0}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{row.totalPackages ?? 0}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{Number(row.totalWeight || 0).toFixed(2)} kg</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {row.status || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => router.push(`/manifests/${encodeURIComponent(row.id || row.manifestNumber)}`)}
                              className="text-slate-700 hover:text-orange-600"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/manifests/${encodeURIComponent(row.id || row.manifestNumber)}?print=1`)}
                              className="text-slate-700 hover:text-orange-600"
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center">
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{emptyMessage}</p>
                        <p className="mt-2 text-xs text-slate-500">Older manifests are still saved — try another date or Last 7 days.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
