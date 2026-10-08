"use client";

import { useEffect, useState } from "react";
import { BookOpen, Wallet } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FranchiseLedgerPage() {
  const [totalCommission, setTotalCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/franchise/commission", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setTotalCommission(data.summary?.totalCommission ?? 0);
        }
      } catch {
        if (!cancelled) setTotalCommission(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            Accounts
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
            My Ledger
          </h1>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-gray-500">Total Commission Earned</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: NAVY }}>
            {loading ? "…" : money(totalCommission)}
          </p>
          <p className="mt-3 text-xs font-medium text-gray-500">From booking markup</p>
        </section>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" strokeWidth={1.5} />
          <h2 className="mt-4 text-xl font-bold" style={{ color: NAVY }}>
            My Ledger — Coming Soon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Detailed ledger will be available soon. Contact admin for payment queries.
          </p>
        </div>
      </div>
    </FranchiseLayout>
  );
}
