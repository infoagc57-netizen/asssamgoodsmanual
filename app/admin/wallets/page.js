"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, Search, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const ROLE_TABS = [
  { key: "all", label: "All" },
  { key: "franchise", label: "Franchise" },
  { key: "customer", label: "Customer" },
];

const emptySummary = {
  totalWallets: 0,
  totalBalance: 0,
  totalCreditLimit: 0,
  totalCreditUsed: 0,
  totalAvailable: 0,
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const roleBadgeClass = (role) =>
  role === "customer"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-purple-100 text-purple-700 border-purple-200";

export default function AdminWalletsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionUserId, setActionUserId] = useState("");
  const [toast, setToast] = useState(null);

  const [addModal, setAddModal] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditSaving, setCreditSaving] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadWallets = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams({ role: roleFilter });
        if (search) qs.set("search", search);
        const res = await fetch(`/api/admin/wallets?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load wallets");
        setWallets(Array.isArray(data.wallets) ? data.wallets : []);
        setSummary({ ...emptySummary, ...(data.summary || {}) });
      } catch (err) {
        showToast(err.message || "Failed to load wallets", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roleFilter, search, showToast],
  );

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === "admin") {
      loadWallets(false);
    }
  }, [sessionStatus, session?.user?.role, loadWallets]);

  const postWalletAction = async (payload) => {
    const res = await fetch("/api/admin/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Action failed");
    return data;
  };

  const openAddModal = (row) => {
    setAddModal(row);
    setAddAmount("");
    setAddNotes("");
  };

  const openCreditModal = (row) => {
    setCreditModal(row);
    setCreditAmount(String(Number(row.creditLimit) || 0));
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addModal) return;
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a valid amount greater than 0", "error");
      return;
    }

    setAddSaving(true);
    try {
      await postWalletAction({
        userId: addModal.userId,
        action: "add_balance",
        amount,
        notes: addNotes.trim(),
      });
      showToast(`Added ${money(amount)} to ${addModal.userName || "wallet"}`, "success");
      setAddModal(null);
      await loadWallets(true);
    } catch (err) {
      showToast(err.message || "Failed to add money", "error");
    } finally {
      setAddSaving(false);
    }
  };

  const handleSetCreditLimit = async (e) => {
    e.preventDefault();
    if (!creditModal) return;
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid credit limit (0 or more)", "error");
      return;
    }

    setCreditSaving(true);
    try {
      await postWalletAction({
        userId: creditModal.userId,
        action: "set_credit_limit",
        amount,
      });
      showToast(
        `Credit limit set to ${money(amount)} for ${creditModal.userName || "user"}`,
        "success",
      );
      setCreditModal(null);
      await loadWallets(true);
    } catch (err) {
      showToast(err.message || "Failed to set credit limit", "error");
    } finally {
      setCreditSaving(false);
    }
  };

  const handleFreezeToggle = async (row) => {
    const isActive = row.isActive !== false;
    if (isActive) {
      const reason = window.prompt("Freeze reason:", "Frozen by admin");
      if (reason === null) return;
      setActionUserId(row.userId);
      try {
        await postWalletAction({
          userId: row.userId,
          action: "freeze",
          notes: String(reason || "").trim() || "Frozen by admin",
        });
        showToast(`Wallet frozen for ${row.userName || "user"}`, "success");
        await loadWallets(true);
      } catch (err) {
        showToast(err.message || "Failed to freeze wallet", "error");
      } finally {
        setActionUserId("");
      }
      return;
    }

    const ok = window.confirm(
      `Unfreeze wallet for ${row.userName || "this user"}?`,
    );
    if (!ok) return;

    setActionUserId(row.userId);
    try {
      await postWalletAction({
        userId: row.userId,
        action: "unfreeze",
      });
      showToast(`Wallet unfrozen for ${row.userName || "user"}`, "success");
      await loadWallets(true);
    } catch (err) {
      showToast(err.message || "Failed to unfreeze wallet", "error");
    } finally {
      setActionUserId("");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
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
              Only admins can manage wallets.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
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
              Wallets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage franchise and customer wallet balances
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadWallets(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Wallets
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
              {summary.totalWallets}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Balance
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
              {money(summary.totalBalance)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Credit Limit
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
              {money(summary.totalCreditLimit)}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
              Total Available
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: ORANGE }}>
              {money(summary.totalAvailable)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone, company…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none ring-orange-200 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_TABS.map((tab) => {
              const active = roleFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRoleFilter(tab.key)}
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
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold" style={{ color: NAVY }}>
              No wallets found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search or role filter.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Name / Company</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Credit Limit</th>
                    <th className="px-4 py-3">Credit Used</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((row) => {
                    const active = row.isActive !== false;
                    const busy = actionUserId === row.userId;
                    return (
                      <tr
                        key={row.userId}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color: NAVY }}>
                            {row.userName || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.userCompany || row.userEmail || "—"}
                          </p>
                          {row.userPhone ? (
                            <p className="text-xs text-slate-400">{row.userPhone}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${roleBadgeClass(
                              row.role,
                            )}`}
                          >
                            {row.role || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {money(row.balance)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {money(row.creditLimit)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {money(row.creditUsed)}
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: ORANGE }}>
                          {money(row.availableWithCredit)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                              active
                                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                : "border-red-200 bg-red-100 text-red-700"
                            }`}
                          >
                            {active ? "active" : "frozen"}
                          </span>
                          {!active && row.frozenReason ? (
                            <p className="mt-1 max-w-[140px] truncate text-[11px] text-red-500">
                              {row.frozenReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openAddModal(row)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Add Money
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openCreditModal(row)}
                              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              Set Credit Limit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleFreezeToggle(row)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60 ${
                                active
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-slate-600 hover:bg-slate-700"
                              }`}
                            >
                              {busy ? "…" : active ? "Freeze" : "Unfreeze"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {addModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" style={{ color: NAVY }}>
                  Add Money
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {addModal.userName || "User"} · Current balance{" "}
                  <span className="font-semibold text-slate-700">
                    {money(addModal.balance)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-orange-200 focus:ring-2"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Notes (optional)
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-orange-200 focus:ring-2"
                  placeholder="Reason for credit…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {addSaving ? "Adding…" : "Add Money"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {creditModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" style={{ color: NAVY }}>
                  Set Credit Limit
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {creditModal.userName || "User"} · Current limit{" "}
                  <span className="font-semibold text-slate-700">
                    {money(creditModal.creditLimit)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreditModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSetCreditLimit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  New Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-orange-200 focus:ring-2"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreditModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creditSaving}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: NAVY }}
                >
                  {creditSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
