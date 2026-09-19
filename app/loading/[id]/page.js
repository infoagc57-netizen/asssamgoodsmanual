"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

function formatDate(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

function statusLabel(status) {
  if (status === "Draft") return "Created";
  return status || "Created";
}

export default function LoadingDetailsPage() {
  const params = useParams();
  const sheetKey = decodeURIComponent(params?.id || "");
  const [sheet, setSheet] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loading-sheets/${encodeURIComponent(sheetKey)}`);
      const data = await res.json();
      if (!res.ok) {
        setSheet(null);
        return;
      }
      setSheet(data.sheet);
      setBookings(data.bookings || []);
      setSummary(data.summary || {});
    } catch {
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [sheetKey]);

  useEffect(() => {
    load();
  }, [load]);

  const dispatch = () => {
    if (!sheet || sheet.status === "Dispatched") return;
    window.location.href = `/trips/new?manifest=${encodeURIComponent(sheet.manifestNumber)}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading sheet…</main>
      </AppLayout>
    );
  }

  if (!sheet) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Manifest not found</h1>
            <Link href="/loading" className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>
              Back to Loading Sheets
            </Link>
          </div>
        </main>
      </AppLayout>
    );
  }

  const displayDate = formatDate(sheet.date);
  const displayStatus = statusLabel(sheet.status);

  return (
    <AppLayout>
      <>
        <main className="loading-details-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link href="/loading" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Loading Sheets / Details
                </Link>
                <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{sheet.manifestNumber}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {sheet.fromBranch || "-"} → {sheet.toBranch || "-"} · {displayStatus}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/loading" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  Back
                </Link>
                <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>
                  Print Loading Sheet
                </button>
                <button
                  type="button"
                  onClick={dispatch}
                  disabled={sheet.status === "Dispatched"}
                  className="rounded-lg bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Dispatch Truck
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[["Manifest", sheet.manifestNumber], ["Date", displayDate], ["Departure Time", sheet.departureTime], ["Truck", sheet.truckNumber], ["Driver", sheet.driverName], ["Driver Mobile", sheet.driverMobile], ["From Branch", sheet.fromBranch], ["To Branch", sheet.toBranch]].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[["Total LR", summary.totalLr], ["Packages", summary.totalPackages], ["Weight", `${Number(summary.totalWeight || 0).toFixed(2)} KG`], ["Freight", money(summary.totalFreight)]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{value}</p>
                </div>
              ))}
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>LR List</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {["LR Number", "Consignor", "Consignee", "Packages", "Weight", "Freight"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => (
                      <tr key={booking.lrNumber}>
                        <td className="px-5 py-3 text-sm font-bold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                        <td className="px-5 py-3 text-sm">{booking.consignor?.name || "-"}</td>
                        <td className="px-5 py-3 text-sm">{booking.consignee?.name || "-"}</td>
                        <td className="px-5 py-3 text-sm">{booking.goods?.packages || 0}</td>
                        <td className="px-5 py-3 text-sm">
                          {Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} KG
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold">{money(booking.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        <section className="loading-print-only">
          <div className="manifest-paper">
            <div className="manifest-head">
              <img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" className="manifest-logo-img" />
              <div>
                <strong>ASSAM GOODS CARRIER</strong>
                <span>SAFE • RELIABLE • ON TIME · LOADING SHEET</span>
              </div>
              <b>{sheet.manifestNumber}</b>
            </div>
            <div className="manifest-meta">
              <span>DATE: {displayDate}</span>
              <span>DEPARTURE: {sheet.departureTime || "-"}</span>
              <span>TRUCK: {sheet.truckNumber || "-"}</span>
              <span>ROUTE: {sheet.fromBranch || "-"} → {sheet.toBranch || "-"}</span>
            </div>
            <div className="manifest-driver">
              <span><b>DRIVER</b> {sheet.driverName || "-"}</span>
              <span><b>MOBILE</b> {sheet.driverMobile || "-"}</span>
              <span><b>STATUS</b> {displayStatus}</span>
            </div>
            <table className="manifest-table">
              <thead>
                <tr>
                  <th>LR Number</th>
                  <th>Consignor</th>
                  <th>Consignee</th>
                  <th>Packages</th>
                  <th>Weight</th>
                  <th>Freight</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.lrNumber}>
                    <td>{booking.lrNumber}</td>
                    <td>{booking.consignor?.name || "-"}</td>
                    <td>{booking.consignee?.name || "-"}</td>
                    <td>{booking.goods?.packages || 0}</td>
                    <td>{Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} KG</td>
                    <td>{money(booking.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="manifest-total">
              <span>
                SUMMARY: {summary.totalLr || 0} LR · {summary.totalPackages || 0} PACKAGES · {Number(summary.totalWeight || 0).toFixed(2)} KG
              </span>
              <strong>{money(summary.totalFreight)}</strong>
            </div>
            <div className="manifest-signatures">
              <span>Prepared By</span>
              <span>Driver Signature</span>
              <span>Dispatch Approval</span>
            </div>
            <footer>Assam Goods Carrier • Subject to Company Rules.</footer>
          </div>
        </section>

        <style jsx global>{`
          .loading-print-only { display: none; }
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
            html, body { background: #fff !important; }
            .loading-details-screen { display: none !important; }
            .loading-print-only { display: block !important; color: #0B1F33; font-family: Arial, Helvetica, sans-serif; }
            .manifest-paper { width: 100%; box-sizing: border-box; border: 1px solid #0B1F33; padding: 7mm; overflow: hidden; }
            .manifest-head { display: flex; align-items: center; gap: 5mm; border-bottom: 2px solid #0B1F33; padding-bottom: 5mm; }
            .manifest-logo-img { height: 16mm; width: auto; object-fit: contain; }
            .manifest-head strong { display: block; font-size: 17pt; letter-spacing: 0.5mm; }
            .manifest-head span { display: block; margin-top: 1mm; color: #64748b; font-size: 8pt; letter-spacing: 1mm; }
            .manifest-head > b { margin-left: auto; color: #F97316; font-size: 15pt; }
            .manifest-meta, .manifest-driver { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; border-bottom: 1px solid #cbd5e1; padding: 4mm 0; font-size: 9pt; }
            .manifest-driver { grid-template-columns: repeat(3, 1fr); }
            .manifest-table { width: 100%; margin-top: 6mm; border-collapse: collapse; font-size: 8pt; }
            .manifest-table th, .manifest-table td { border: 1px solid #94a3b8; padding: 3mm 2mm; text-align: left; }
            .manifest-table th { background: #0B1F33; color: #fff; font-size: 7pt; text-transform: uppercase; }
            .manifest-total { display: flex; justify-content: space-between; margin-top: 6mm; padding: 4mm; background: #F97316; color: #fff; font-size: 10pt; font-weight: 800; }
            .manifest-total strong { font-size: 14pt; }
            .manifest-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15mm; margin-top: 35mm; }
            .manifest-signatures span { border-top: 1px solid #0B1F33; padding-top: 4mm; text-align: center; font-size: 8pt; }
            .manifest-paper footer { margin-top: 8mm; border-top: 1px solid #cbd5e1; padding-top: 3mm; text-align: center; color: #64748b; font-size: 8pt; }
          }
        `}</style>
      </>
    </AppLayout>
  );
}
