"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

const emptySummary = {
  pendingCount: 0,
  pendingAmount: 0,
  approvedTodayCount: 0,
  approvedTodayAmount: 0,
  rejectedCount: 0,
  totalProcessedToday: 0,
};

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

const statusBadgeClass = (status) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "expired":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const roleBadgeClass = (role) =>
  role === "customer"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-purple-100 text-purple-700 border-purple-200";

const emptyMessageFor = (filter) => {
  switch (filter) {
    case "pending":
      return "No pending recharges";
    case "approved":
      return "No approved recharges";
    case "rejected":
      return "No rejected recharges";
    case "expired":
      return "No expired recharges";
    default:
      return "No recharge requests found";
  }
};

export default function AdminWalletRechargesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [filter, setFilter] = useState("pending");
  const [recharges, setRecharges] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadRecharges = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams({ status: filter });
        const res = await fetch(`/api/admin/wallet-recharges?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load recharges");
        setRecharges(Array.isArray(data.recharges) ? data.recharges : []);
        setSummary({ ...emptySummary, ...(data.summary || {}) });
      } catch (err) {
        showToast(err.message || "Failed to load recharges", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, showToast],
  );

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === "admin") {
      loadRecharges(false);
    }
  }, [sessionStatus, session?.user?.role, loadRecharges]);

  useEffect(() => {
    if (filter !== "pending") return undefined;
    if (session?.user?.role !== "admin") return undefined;
    const timer = setInterval(() => {
      loadRecharges(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [filter, session?.user?.role, loadRecharges]);

  const handleApprove = async (item) => {
    const ok = window.confirm(
      `Approve ${money(item.amount)} recharge for ${item.userName || "this user"}?`,
    );
    if (!ok) return;

    setActionId(item.id);
    try {
      const res = await fetch(`/api/admin/wallet-recharges/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve recharge");
      showToast(`Recharge approved! Wallet credited ${money(item.amount)}`, "success");
      await loadRecharges(true);
    } catch (err) {
      showToast(err.message || "Failed to approve recharge", "error");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (item) => {
    const reason = window.prompt("Rejection reason:", "Invalid UTR / payment not received");
    if (reason === null) return;

    setActionId(item.id);
    try {
      const res = await fetch(`/api/admin/wallet-recharges/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: String(reason || "").trim() || "No reason provided",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject recharge");
      showToast("Recharge rejected", "success");
      await loadRecharges(true);
    } catch (err) {
      showToast(err.message || "Failed to reject recharge", "error");
    } finally {
      setActionId("");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </AppLayout>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-bold text-red-700">Access Denied</h1>
            <p className="mt-2 text-sm text-slate-500">
              Only admins can review wallet recharges.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {toast && (
          <div
            className={`fixed right-4 top-4 z-[100] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            role="status"
          >
            {toast.message}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
              Wallet Recharges
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Approve or reject franchise/customer wallet recharge requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadRecharges(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
              Pending Requests
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: ORANGE }}>
              {summary.pendingCount}
            </p>
            <p className="mt-1 text-sm font-semibold text-orange-800">
              {money(summary.pendingAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Approved Today
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {summary.approvedTodayCount}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              {money(summary.approvedTodayAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejected</p>
            <p className="mt-2 text-2xl font-bold text-red-700">{summary.rejectedCount}</p>
            <p className="mt-1 text-sm text-red-600">Total rejected</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Processed Today
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
              {summary.totalProcessedToday}
            </p>
            <p className="mt-1 text-sm text-slate-500">Approved + rejected</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                style={active ? { backgroundColor: NAVY } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : recharges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold" style={{ color: NAVY }}>
              {emptyMessageFor(filter)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              New requests will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recharges.map((item) => {
              const busy = actionId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="relative min-w-0 flex-1 pr-24">
                      <span
                        className={`absolute right-0 top-0 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusBadgeClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold" style={{ color: NAVY }}>
                          {item.userName || "Unknown user"}
                        </h3>
                        {item.userCompany ? (
                          <span className="text-sm text-slate-500">{item.userCompany}</span>
                        ) : null}
                        {item.role ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${roleBadgeClass(
                              item.role,
                            )}`}
                          >
                            {item.role}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {[item.userEmail, item.userPhone].filter(Boolean).join(" · ") || "—"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-baseline gap-3">
                        <p className="text-2xl font-bold" style={{ color: ORANGE }}>
                          {money(item.amount)}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          Ref: {item.uniqueCode || "—"}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span>
                          UTR:{" "}
                          <span className="font-medium text-slate-800">
                            {item.utr || "—"}
                          </span>
                        </span>
                        <span>Created: {formatDate(item.createdAt)}</span>
                      </div>

                      {item.status === "rejected" && item.rejectionReason ? (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          Reason: {item.rejectionReason}
                        </p>
                      ) : null}

                      {item.status === "approved" ? (
                        <p className="mt-2 text-sm text-emerald-700">
                          Approved: {formatDate(item.approvedAt)}
                        </p>
                      ) : null}
                    </div>

                    {item.status === "pending" ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApprove(item)}
                          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busy ? "Working…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReject(item)}
                          className="rounded-xl border-2 border-red-500 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
