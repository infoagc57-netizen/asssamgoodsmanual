"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const inputClass =
  "h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function FranchiseWalletRechargePage() {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [recharge, setRecharge] = useState(null);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const expiresAtMs = useMemo(() => {
    if (!recharge?.expiresAt) return 0;
    const stamp = new Date(recharge.expiresAt).getTime();
    return Number.isNaN(stamp) ? 0 : stamp;
  }, [recharge?.expiresAt]);

  const remainingMs = Math.max(0, expiresAtMs - now);
  const isExpired = Boolean(recharge) && remainingMs <= 0;

  useEffect(() => {
    if (step !== 2 || !recharge?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, recharge?.expiresAt]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/franchise/wallet/recharge", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load recharge");
      if (data.recharge) {
        setRecharge(data.recharge);
        setAmount(String(data.recharge.amount || ""));
        setStep(data.recharge.utr ? 4 : 2);
        setNow(Date.now());
      }
    } catch (err) {
      setError(err.message || "Failed to load recharge");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const validateAmount = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 100) return "Minimum recharge amount is ₹100.";
    if (num > 100000) return "Maximum recharge amount is ₹1,00,000.";
    return "";
  };

  const handleGenerate = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/franchise/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate QR");
      setRecharge(data.recharge);
      setUtr("");
      setStep(2);
      setNow(Date.now());
    } catch (err) {
      setError(err.message || "Failed to generate QR");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitUtr = async (event) => {
    event.preventDefault();
    const value = utr.trim();
    if (!value) {
      setError("Enter UTR / Transaction ID.");
      return;
    }
    if (!recharge?.id) {
      setError("No active recharge found.");
      return;
    }
    if (isExpired) {
      setError("QR has expired. Generate a new one.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/franchise/wallet/recharge/${encodeURIComponent(recharge.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payment proof");
      setRecharge(data.recharge);
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to submit payment proof");
    } finally {
      setSubmitting(false);
    }
  };

  const resetToStep1 = () => {
    setStep(1);
    setRecharge(null);
    setAmount("");
    setUtr("");
    setError("");
  };

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            Wallet
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
            {step === 4 ? "Payment Proof Submitted!" : step === 2 ? `Scan & Pay ${money(recharge?.amount)}` : "Add Money to Wallet"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 4
              ? "Waiting for admin approval"
              : step === 2
                ? "Use any UPI app (GPay, PhonePe, Paytm, BHIM)"
                : "Choose an amount to generate UPI QR code"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        ) : step === 1 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Quick amounts
            </p>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className={`h-[42px] rounded-xl border text-sm font-semibold transition ${
                    Number(amount) === value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                  }`}
                >
                  {money(value)}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Custom amount</label>
            <div className="relative mb-5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-semibold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={100}
                max={100000}
                step="1"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} pl-8`}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ORANGE }}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate QR Code"
              )}
            </button>
          </section>
        ) : step === 4 ? (
          <section className="rounded-2xl border border-emerald-200 bg-white px-6 py-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h2 className="mt-4 text-2xl font-bold" style={{ color: NAVY }}>
              Payment Proof Submitted!
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Amount: <span className="font-semibold" style={{ color: NAVY }}>{money(recharge?.amount)}</span>
            </p>
            <p className="mt-1 font-mono text-sm text-slate-600">
              Reference: {recharge?.uniqueCode}
            </p>
            <p className="mt-3 text-sm font-semibold text-orange-700">Status: Pending Admin Approval</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              You&apos;ll be notified once your wallet is credited.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/franchise/wallet"
                className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: NAVY }}
              >
                Go to Wallet
              </Link>
              <button
                type="button"
                onClick={resetToStep1}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Add More
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {isExpired ? (
                <div className="py-8 text-center">
                  <p className="text-lg font-bold text-rose-600">QR Expired</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Generate a new QR code to continue.
                  </p>
                  <button
                    type="button"
                    onClick={resetToStep1}
                    className="mt-5 inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    Generate New QR
                  </button>
                </div>
              ) : (
                <>
                  {recharge?.qrDataUrl ? (
                    <img
                      src={recharge.qrDataUrl}
                      alt="UPI QR Code"
                      width={300}
                      height={300}
                      className="mx-auto h-[300px] w-[300px] rounded-xl border border-slate-100 bg-white object-contain"
                    />
                  ) : (
                    <div className="mx-auto flex h-[300px] w-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                      QR unavailable
                    </div>
                  )}

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">or</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <a
                    href={recharge?.upiUri || "#"}
                    className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: NAVY }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in UPI App
                  </a>

                  <p className="mt-4 text-center font-mono text-sm font-semibold" style={{ color: NAVY }}>
                    Reference: {recharge?.uniqueCode}
                  </p>
                  <p className="mt-2 text-center text-sm text-slate-500">
                    QR expires in{" "}
                    <span className="font-semibold text-orange-700">{formatCountdown(remainingMs)}</span>
                  </p>
                </>
              )}
            </section>

            {!isExpired && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <form onSubmit={handleSubmitUtr}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    After payment, enter UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 123456789012"
                    className={`${inputClass} mb-4`}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit Payment Proof"
                    )}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </FranchiseLayout>
  );
}
