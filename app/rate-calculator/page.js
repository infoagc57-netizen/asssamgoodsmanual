"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { INDIA_CITY_OPTIONS } from "@/lib/indiaCities";
import { loadRatesWithMigration } from "@/lib/rateClient";
import {
  buildFreightEstimate,
  COD_HANDLING_FEE,
  FM_CHARGE_RATE,
  rateTypeLabel,
  volumetricWeightKg,
} from "@/lib/rateEstimate";
import { amountInWords } from "@/lib/amountInWords";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const DEFAULT_FROM = "Panchkula, Haryana";
const PINCODE_API_BASE = "https://api.postalpincode.in/pincode";

const inp =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function lookupPincode(pincode) {
  const response = await fetch(`${PINCODE_API_BASE}/${pincode}`);
  if (!response.ok) throw new Error("Pincode lookup failed");
  const payload = await response.json();
  const block = Array.isArray(payload) ? payload[0] : null;
  if (!block || block.Status !== "Success" || !Array.isArray(block.PostOffice) || !block.PostOffice.length) {
    return { ok: false, message: block?.Message || "No records found" };
  }
  const office = block.PostOffice[0];
  const city = office.District || office.Name || "";
  const state = office.State || "";
  return { ok: true, city, state, label: [city, state].filter(Boolean).join(", ") };
}

function Field({ label, children, help }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: NAVY }}>
        {label}
      </label>
      {children}
      {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
    </div>
  );
}

function buildShareText(estimate, form) {
  const lines = [
    "*AGC Freight Estimate*",
    "",
    `From: ${form.fromStation || "—"}`,
    `To: ${form.toStation || "—"}`,
    `Packages: ${form.packages || 0} | Charged weight: ${estimate.chargedWeight || 0} kg`,
  ];
  if (estimate.matchedRate) {
    lines.push(
      `Rate: ${money(estimate.matchedRate.rate)} (${rateTypeLabel(estimate.matchedRate.rateType)})`,
    );
  } else if (form.toStation) {
    lines.push(`Rate: Not found in master for ${form.toStation}`);
  }
  lines.push("");
  if (estimate.baseFreight > 0) lines.push(`Base freight: ${money(estimate.baseFreight)}`);
  if (estimate.fmCharge > 0) lines.push(`FM charges: ${money(estimate.fmCharge)}`);
  if (estimate.codCharge > 0) lines.push(`COD handling: ${money(estimate.codCharge)}`);
  if (estimate.doorDelivery > 0) lines.push(`Door delivery: ${money(estimate.doorDelivery)}`);
  if (estimate.otherCharges > 0) lines.push(`Other charges: ${money(estimate.otherCharges)}`);
  lines.push("", `*Grand total: ${money(estimate.grandTotal)}*`, amountInWords(estimate.grandTotal));
  lines.push("", "_Indicative estimate only. Final charges at booking._");
  return lines.join("\n");
}

export default function RateCalculatorPage() {
  const [rates, setRates] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeHint, setPincodeHint] = useState("");
  const [copyState, setCopyState] = useState("");

  const [form, setForm] = useState({
    fromStation: DEFAULT_FROM,
    toStation: "",
    packages: "",
    actualWeight: "",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    handlingType: "fm",
    codEnabled: false,
    codAmount: "",
    doorDelivery: "",
    otherCharges: "",
  });

  const setField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRatesLoading(true);
      try {
        const list = await loadRatesWithMigration();
        if (cancelled) return;
        setRates(list);
        const stationList = [
          ...new Set(
            list
              .filter((rate) => (rate.status || "Active") === "Active")
              .map((rate) => {
                const station = rate.toStation || rate.toBranchName || rate.toBranch;
                return station ? String(station).trim() : "";
              })
              .filter(Boolean),
          ),
        ].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
        setDestinations(stationList);
      } catch {
        if (!cancelled) {
          setRates([]);
          setDestinations([]);
        }
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDestPincode = useCallback(async (pincode) => {
    setPincodeLoading(true);
    setPincodeHint("");
    try {
      const result = await lookupPincode(pincode);
      if (!result.ok) {
        setPincodeHint(result.message || "Pincode not found");
        return;
      }
      setForm((prev) => ({ ...prev, toStation: result.label || result.city }));
      setPincodeHint(`Pincode ${pincode}: ${result.label}`);
    } catch {
      setPincodeHint("Could not look up pincode");
    } finally {
      setPincodeLoading(false);
    }
  }, []);

  const packages = Number(form.packages) || 0;
  const volumetric = useMemo(
    () =>
      volumetricWeightKg({
        length: form.dimLength,
        width: form.dimWidth,
        height: form.dimHeight,
        packages,
      }),
    [form.dimLength, form.dimWidth, form.dimHeight, packages],
  );

  const estimate = useMemo(
    () =>
      buildFreightEstimate({
        fromStation: form.fromStation,
        toStation: form.toStation,
        packages,
        actualWeight: form.actualWeight,
        volumetricWeight: volumetric,
        handlingType: form.handlingType,
        codEnabled: form.codEnabled,
        doorDelivery: form.doorDelivery,
        otherCharges: form.otherCharges,
        rates,
      }),
    [form, packages, volumetric, rates],
  );

  const shareText = useMemo(() => buildShareText(estimate, form), [estimate, form]);
  const words = estimate.grandTotal > 0 ? amountInWords(estimate.grandTotal) : "";

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText.replace(/\*/g, ""))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText.replace(/\*/g, ""));
      setCopyState("Copied!");
      window.setTimeout(() => setCopyState(""), 2000);
    } catch {
      setCopyState("Copy failed");
    }
  };

  const handlePrint = () => window.print();

  const rateDisplay = estimate.matchedRate
    ? `${money(estimate.matchedRate.rate)} (${rateTypeLabel(estimate.matchedRate.rateType)})`
    : form.toStation
      ? "—"
      : "Select destination";

  return (
    <AppLayout>
      <main className="rate-calculator-screen min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Operations
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Rate Calculator</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quick freight estimate from rate master — for sales and customer quotes before booking.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <section className="space-y-5 lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Route</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="From station" help="Origin city">
                    <SearchableSelect
                      value={form.fromStation}
                      onChange={(v) => setForm((p) => ({ ...p, fromStation: v }))}
                      options={INDIA_CITY_OPTIONS}
                      placeholder="Search city"
                      allowCustom
                      inputClassName={inp}
                    />
                  </Field>
                  <Field
                    label="To station / destination"
                    help="Rate master station or type 6-digit pincode"
                  >
                    <div className="relative">
                      <SearchableSelect
                        value={form.toStation}
                        onChange={(v) => {
                          setPincodeHint("");
                          setForm((p) => ({ ...p, toStation: v }));
                        }}
                        onPincodeDetected={handleDestPincode}
                        options={destinations}
                        placeholder={ratesLoading ? "Loading stations…" : "Station or pincode"}
                        allowCustom
                        inputClassName={`${inp}${pincodeLoading ? " pr-10" : ""}`}
                      />
                      {pincodeLoading && (
                        <span className="pointer-events-none absolute right-3 top-[11px]">
                          <svg className="h-4 w-4 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {pincodeHint && <p className="mt-1 text-[11px] text-emerald-700">{pincodeHint}</p>}
                    {estimate.rateMissing && (
                      <p className="mt-1 text-[11px] font-medium text-amber-700">
                        No rate found for &quot;{form.toStation}&quot;
                      </p>
                    )}
                  </Field>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Package details</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Number of packages">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.packages}
                      onChange={setField("packages")}
                      placeholder="0"
                      className={inp}
                    />
                  </Field>
                  <Field label="Actual weight (kg)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.actualWeight}
                      onChange={setField("actualWeight")}
                      placeholder="0.00"
                      className={inp}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Dimensions (cm)" help="Optional — L × W × H per package">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="L"
                        value={form.dimLength}
                        onChange={setField("dimLength")}
                        className={inp}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="W"
                        value={form.dimWidth}
                        onChange={setField("dimWidth")}
                        className={inp}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="H"
                        value={form.dimHeight}
                        onChange={setField("dimHeight")}
                        className={inp}
                      />
                    </div>
                  </Field>
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Volumetric:</span>{" "}
                    {volumetric > 0 ? `${volumetric.toFixed(2)} kg` : "—"}{" "}
                    <span className="text-slate-400">((L×W×H×packages) ÷ 5000)</span>
                    {estimate.chargedWeight > 0 && (
                      <>
                        {" · "}
                        <span className="font-semibold text-slate-700">Charged:</span>{" "}
                        {estimate.chargedWeight.toFixed(2)} kg
                        {estimate.weightSource === "volumetric" ? (
                          <span className="text-orange-700"> (volumetric)</span>
                        ) : (
                          <span className="text-emerald-700"> (actual)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Options</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">Pickup / handling</p>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {[
                        { id: "fm", label: "FM pickup" },
                        { id: "selfdrop", label: "Self drop" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, handlingType: opt.id }))}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            form.handlingType === opt.id
                              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.handlingType === "fm" && (
                      <p className="mt-1 text-[11px] text-slate-500">FM @ ₹{FM_CHARGE_RATE.toFixed(2)}/kg on charged weight</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-600">COD</p>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, codEnabled: !p.codEnabled }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          form.codEnabled
                            ? "border-orange-200 bg-orange-50 text-orange-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {form.codEnabled ? `COD on (+${money(COD_HANDLING_FEE)})` : "COD off"}
                      </button>
                    </div>
                    {form.codEnabled && (
                      <Field label="COD amount (info)">
                        <input
                          type="number"
                          min="0"
                          value={form.codAmount}
                          onChange={setField("codAmount")}
                          placeholder="Collectible amount"
                          className={`${inp} max-w-[200px]`}
                        />
                      </Field>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Door delivery (₹)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.doorDelivery}
                        onChange={setField("doorDelivery")}
                        placeholder="0.00"
                        className={inp}
                      />
                    </Field>
                    <Field label="Other charges (₹)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.otherCharges}
                        onChange={setField("otherCharges")}
                        placeholder="0.00"
                        className={inp}
                      />
                    </Field>
                  </div>

                  {estimate.matchedRate && (
                    <p className="text-xs text-slate-500">
                      Rate type from master:{" "}
                      <span className="font-semibold text-slate-800">{estimate.matchedRate.rateType || "Per Kg"}</span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <aside className="lg:col-span-2">
              <div className="estimate-panel sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-md lg:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Live estimate</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Rate from master</span>
                    <span className="text-right font-semibold text-slate-800">{rateDisplay}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Charged weight</span>
                    <span className="font-semibold tabular-nums text-slate-800">
                      {estimate.chargedWeight > 0 ? `${estimate.chargedWeight.toFixed(2)} kg` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Base freight</span>
                    <span className="font-semibold tabular-nums">{money(estimate.baseFreight)}</span>
                  </div>
                  {estimate.fmCharge > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">FM charges</span>
                      <span className="font-semibold tabular-nums">{money(estimate.fmCharge)}</span>
                    </div>
                  )}
                  {estimate.codCharge > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">COD handling</span>
                      <span className="font-semibold tabular-nums">{money(estimate.codCharge)}</span>
                    </div>
                  )}
                  {estimate.doorDelivery > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Door delivery</span>
                      <span className="font-semibold tabular-nums">{money(estimate.doorDelivery)}</span>
                    </div>
                  )}
                  {estimate.otherCharges > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Other charges</span>
                      <span className="font-semibold tabular-nums">{money(estimate.otherCharges)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-200 pt-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-600">Sub total</span>
                      <span className="font-bold tabular-nums" style={{ color: NAVY }}>{money(estimate.subTotal)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-bold uppercase tracking-wide text-orange-900">Grand total</span>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: ORANGE }}>
                        {money(estimate.grandTotal)}
                      </span>
                    </div>
                  </div>
                  {words && (
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-700">In words:</span> {words}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    WhatsApp Share
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copyState || "Copy Estimate"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white"
                    style={{ backgroundColor: NAVY }}
                  >
                    Print Estimate
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="rate-estimate-print hidden">
          <div className="p-8">
            <h1 style={{ color: NAVY, fontSize: "18pt", marginBottom: "8px" }}>AGC Freight Estimate</h1>
            <p>{form.fromStation} → {form.toStation || "—"}</p>
            <p>Packages: {packages} | Charged: {estimate.chargedWeight.toFixed(2)} kg</p>
            <hr />
            <p>Base freight: {money(estimate.baseFreight)}</p>
            {estimate.fmCharge > 0 && <p>FM: {money(estimate.fmCharge)}</p>}
            {estimate.codCharge > 0 && <p>COD: {money(estimate.codCharge)}</p>}
            {estimate.doorDelivery > 0 && <p>Door delivery: {money(estimate.doorDelivery)}</p>}
            {estimate.otherCharges > 0 && <p>Other: {money(estimate.otherCharges)}</p>}
            <p><strong>Grand total: {money(estimate.grandTotal)}</strong></p>
            {words && <p>{words}</p>}
            <p style={{ fontSize: "9pt", marginTop: "16px" }}>Indicative estimate only.</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .rate-estimate-print {
          display: none;
        }
        @media print {
          @page {
            size: A5 portrait;
            margin: 12mm;
          }
          .rate-calculator-screen {
            display: none !important;
          }
          .rate-estimate-print {
            display: block !important;
            color: #071b34;
            font-family: Arial, Helvetica, sans-serif;
          }
        }
      `}</style>
    </AppLayout>
  );
}
