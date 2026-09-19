"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

export default function ManifestDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const manifestKey = decodeURIComponent(params?.id || "");

  const [manifest, setManifest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manifests/${encodeURIComponent(manifestKey)}`);
      const data = await res.json();
      if (!res.ok) {
        setManifest(null);
        setBookings([]);
        return;
      }
      setManifest(data.manifest);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setManifest(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [manifestKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && manifest && !loading) {
      const timer = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [searchParams, manifest, loading]);

  if (loading) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading manifest…</main>
      </AppLayout>
    );
  }

  if (!manifest) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Manifest not found</h1>
            <Link href="/manifests" className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>
              Back to Manifests
            </Link>
          </div>
        </main>
      </AppLayout>
    );
  }

  const totals = {
    packages: manifest.totalPackages ?? bookings.reduce((s, b) => s + Number(b.goods?.packages || 0), 0),
    weight: manifest.totalWeight ?? bookings.reduce((s, b) => s + Number(b.goods?.chargedWeight || b.goods?.actualWeight || 0), 0),
    amount: manifest.totalAmount ?? bookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
  };

  return (
    <AppLayout>
      <main className="manifest-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="manifest-print-root mx-auto max-w-6xl">
          <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/manifests" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Manifests / Details
              </Link>
              <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{manifest.manifestNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {manifest.fromBranch || "—"} → {manifest.toBranch || "—"} · {manifest.status || "Draft"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/manifests" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                Back
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: ORANGE }}
              >
                Print Manifest
              </button>
            </div>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
            <header className="border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Assam Goods Carrier</p>
              <h2 className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
                MANIFEST #{manifest.manifestNumber}
              </h2>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <p><span className="font-semibold text-slate-700">Date:</span> {formatDate(manifest.date)}</p>
                <p><span className="font-semibold text-slate-700">Truck:</span> {manifest.truckNumber || "—"}</p>
                <p><span className="font-semibold text-slate-700">Driver:</span> {manifest.driverName || "—"} {manifest.driverMobile ? `(${manifest.driverMobile})` : ""}</p>
                <p><span className="font-semibold text-slate-700">From:</span> {manifest.fromBranch || "—"}</p>
                <p><span className="font-semibold text-slate-700">To:</span> {manifest.toBranch || "—"}</p>
                {manifest.transporterName ? (
                  <p><span className="font-semibold text-slate-700">Transporter:</span> {manifest.transporterName}</p>
                ) : null}
              </div>
              {manifest.notes ? (
                <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Notes:</span> {manifest.notes}</p>
              ) : null}
            </header>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    {["SR", "LR No", "Consignee", "City", "Pkgs", "Weight", "Amount"].map((heading) => (
                      <th key={heading} className="border border-slate-200 px-3 py-2">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => (
                    <tr key={booking.lrNumber}>
                      <td className="border border-slate-200 px-3 py-2">{index + 1}</td>
                      <td className="border border-slate-200 px-3 py-2 font-semibold" style={{ color: NAVY }}>{booking.lrNumber}</td>
                      <td className="border border-slate-200 px-3 py-2">{booking.consignee?.name || "—"}</td>
                      <td className="border border-slate-200 px-3 py-2">{booking.consignee?.city || booking.route?.deliveryBranch || "—"}</td>
                      <td className="border border-slate-200 px-3 py-2 text-right">{booking.goods?.packages || 0}</td>
                      <td className="border border-slate-200 px-3 py-2 text-right">
                        {Number(booking.goods?.chargedWeight || booking.goods?.actualWeight || 0).toFixed(2)} kg
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-right">{money(booking.grandTotal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="border border-slate-200 px-3 py-2" colSpan={4}>Totals</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{totals.packages}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{Number(totals.weight).toFixed(2)} kg</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{money(totals.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {["Dispatcher", "Driver", "Receiver"].map((role) => (
                <div key={role}>
                  <div className="h-16 border-b border-slate-400" />
                  <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{role} Signature</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </main>
    </AppLayout>
  );
}
