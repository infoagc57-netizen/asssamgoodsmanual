"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function statusLabel(status) {
  if (status === "Draft") return "Created";
  return status || "Created";
}

function LoadingPage() {
  const [sheets, setSheets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loading-sheets");
      const data = await res.json();
      setSheets(res.ok && Array.isArray(data.sheets) ? data.sheets : []);
    } catch {
      setSheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleSheets = sheets.filter((sheet) =>
    [sheet.manifestNumber, sheet.truckNumber, sheet.fromBranch, sheet.toBranch]
      .some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Loading Sheets</h1>
            <p className="mt-1 text-sm text-slate-500">Build and dispatch route-wise manifests from booked LR records.</p>
          </div>
          <Link
            href="/loading/new"
            className="inline-flex h-[42px] items-center rounded-xl px-5 text-sm font-semibold text-white"
            style={{ backgroundColor: ORANGE }}
          >
            + Create Loading Sheet
          </Link>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manifest, truck or route"
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Manifest Number", "Truck", "Route", "LR Count", "Packages", "Weight", "Status"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center text-sm text-slate-500">Loading sheets…</td>
                  </tr>
                ) : visibleSheets.length ? (
                  visibleSheets.map((sheet) => (
                    <tr key={sheet.id || sheet.manifestNumber} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4">
                        <Link
                          href={`/loading/${encodeURIComponent(sheet.manifestNumber)}`}
                          className="text-sm font-bold hover:text-orange-600"
                          style={{ color: NAVY }}
                        >
                          {sheet.manifestNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{sheet.truckNumber || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {sheet.fromBranch || "-"} → {sheet.toBranch || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{sheet.totalBookings ?? sheet.lrNumbers?.length ?? 0}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{sheet.totalPackages ?? 0}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{Number(sheet.totalWeight || 0).toFixed(2)} KG</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          {statusLabel(sheet.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>
                      No loading sheets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoadingPageWithLayout() {
  return <AppLayout><LoadingPage /></AppLayout>;
}
