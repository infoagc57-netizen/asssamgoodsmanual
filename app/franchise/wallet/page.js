"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const reasonLabel = (reason) =>
  String(reason || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";

const emptyWallet = {
  id: "",
  balance: 0,
  creditLimit: 0,
  creditUsed: 0,
  isActive: true,
  availableWithCredit: 0,
  frozenReason: "",
  lastTransactionAt: null,
};

export default function FranchiseWalletPage() {
  useSession();
  const [wallet, setWallet] = useState(emptyWallet);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/franchise/wallet", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load wallet");
      setWallet({ ...emptyWallet, ...(data.wallet || {}) });
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      setError(err.message || "Failed to load wallet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWallet(false);
  }, [loadWallet]);

  const creditAvailable = Math.max(
    0,
    (Number(wallet.creditLimit) || 0) - (Number(wallet.creditUsed) || 0),
  );

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Finance
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
              My Wallet
            </h1>
            <p className="mt-1 text-sm text-slate-500">Manage your balance and transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadWallet(true)}
              disabled={loading || refreshing}
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              aria-label="Refresh wallet"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/franchise/wallet/recharge"
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              <Plus className="h-4 w-4" />
              Add Money
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {!wallet.isActive && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            ⚠️ Your wallet is frozen. Reason: {wallet.frozenReason || "Not specified"}. Please contact admin.
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <section
                className="rounded-2xl p-6 text-white shadow-sm"
                style={{ backgroundColor: NAVY }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Available Balance
                  </p>
                  <Wallet className="h-5 w-5 text-orange-400" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  {money(wallet.balance)}
                </p>
                <p className="mt-3 text-sm text-white/55">
                  Cash available for instant booking
                </p>
              </section>

              <section className="rounded-2xl border-2 bg-white p-6 shadow-sm" style={{ borderColor: ORANGE }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Credit Limit Available
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: NAVY }}>
                  {money(creditAvailable)}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Total spending power:{" "}
                  <span className="font-semibold" style={{ color: ORANGE }}>
                    {money(wallet.availableWithCredit)}
                  </span>
                </p>
              </section>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Credit Limit", value: money(wallet.creditLimit) },
                { label: "Credit Used", value: money(wallet.creditUsed) },
                {
                  label: "Available with Credit",
                  value: money(wallet.availableWithCredit),
                  highlight: true,
                },
              ].map((item) => (
                <section
                  key={item.label}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    item.highlight
                      ? "border-orange-200 bg-orange-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p
                    className="mt-2 text-xl font-bold"
                    style={{ color: item.highlight ? ORANGE : NAVY }}
                  >
                    {item.value}
                  </p>
                </section>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold" style={{ color: NAVY }}>
                    Transaction History
                  </h2>
                  <p className="text-xs text-slate-500">Last 50 transactions</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Date", "Type", "Amount", "Balance After", "Reason", "Description"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.length ? (
                      transactions.map((tx) => {
                        const isCredit = tx.type === "credit";
                        return (
                          <tr key={tx.id} className="hover:bg-orange-50/30">
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatDate(tx.createdAt)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  isCredit
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {isCredit ? "Credit" : "Debit"}
                              </span>
                            </td>
                            <td
                              className={`whitespace-nowrap px-5 py-4 text-sm font-semibold ${
                                isCredit ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {money(tx.amount)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold" style={{ color: NAVY }}>
                              {money(tx.balanceAfter)}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{reasonLabel(tx.reason)}</td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {tx.description || "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-5 py-20 text-center">
                          <p className="text-sm font-semibold" style={{ color: NAVY }}>
                            No transactions yet. Add money to get started!
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </FranchiseLayout>
  );
}
