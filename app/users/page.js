"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AppLayout from "@/components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "customer",
  companyName: "",
  gstNumber: "",
  phone: "",
  address: "",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "customer", label: "Customers" },
  { id: "franchise", label: "Franchisees" },
  { id: "inactive", label: "Inactive" },
];

const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

function isPending(user) {
  return user?.status === "pending_approval";
}

function roleBadgeClass(user) {
  if (isPending(user)) {
    return "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-300";
  }
  if (!user.isActive || user.status === "inactive" || user.status === "suspended") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  if (user.role === "franchise") {
    return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
  }
  return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
}

function roleLabel(user) {
  if (isPending(user)) return "Pending Approval";
  if (!user.isActive || user.status === "inactive" || user.status === "suspended") {
    return "inactive";
  }
  return user.role || "customer";
}

export default function UsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setUsers([]);
      showToast(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === "admin") {
      loadUsers();
    } else if (sessionStatus !== "loading") {
      setLoading(false);
    }
  }, [sessionStatus, session?.user?.role, loadUsers]);

  const filteredUsers = useMemo(() => {
    if (filter === "pending") {
      return users.filter((u) => isPending(u));
    }
    if (filter === "inactive") {
      return users.filter(
        (u) =>
          !isPending(u) &&
          (!u.isActive || u.status === "inactive" || u.status === "suspended"),
      );
    }
    if (filter === "customer" || filter === "franchise") {
      return users.filter((u) => u.role === filter);
    }
    return users;
  }, [users, filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      showToast("User created successfully");
      await loadUsers();
    } catch (err) {
      setCreateError(err.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditError("");
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "customer",
      companyName: user.companyName || "",
      gstNumber: user.gstNumber || "",
      phone: user.phone || "",
      address: user.address || "",
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name,
        companyName: editForm.companyName,
        gstNumber: editForm.gstNumber,
        phone: editForm.phone,
        address: editForm.address,
      };
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditingUser(null);
      showToast("User updated");
      await loadUsers();
    } catch (err) {
      setEditError(err.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (user) => {
    const next = window.prompt(`New password for ${user.email}`);
    if (next === null) return;
    if (!String(next).trim()) {
      showToast("Password cannot be empty", "error");
      return;
    }
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");
      showToast("Password updated");
    } catch (err) {
      showToast(err.message || "Password reset failed", "error");
    } finally {
      setActionId("");
    }
  };

  const handleToggleActive = async (user) => {
    const nextActive = !user.isActive;
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextActive,
          status: nextActive ? "active" : "inactive",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      showToast(nextActive ? "User activated" : "User deactivated");
      await loadUsers();
    } catch (err) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setActionId("");
    }
  };

  const handleApprove = async (user) => {
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "active" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      showToast(`${user.name} approved`);
      await loadUsers();
    } catch (err) {
      showToast(err.message || "Approve failed", "error");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (user) => {
    const ok = window.confirm(
      `Reject and remove ${user.name} (${user.email})? This cannot be undone.`,
    );
    if (!ok) return;
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      showToast("Signup rejected and removed");
      await loadUsers();
    } catch (err) {
      showToast(err.message || "Reject failed", "error");
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (user) => {
    const ok = window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`);
    if (!ok) return;
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      showToast("User deleted");
      await loadUsers();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    } finally {
      setActionId("");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <AppLayout>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-bold text-red-700">Access Denied</h1>
            <p className="mt-2 text-sm text-slate-500">Only admins can manage users.</p>
          </div>
        </main>
      </AppLayout>
    );
  }

  const emptyMessage =
    filter === "pending"
      ? { title: "No pending approvals", hint: "New signups awaiting approval will appear here." }
      : {
          title: "No users found",
          hint: "Create a customer or franchisee to get started.",
        };

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
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

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
                Admin
              </p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
                User Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">Manage customers and franchisees</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreate((v) => !v);
                setCreateError("");
              }}
              className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: ORANGE }}
            >
              {showCreate ? "Close form" : "Create User"}
            </button>
          </div>

          {showCreate && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Create user
              </p>
              <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
                  <input
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputClass}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Email *</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className={inputClass}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Password *</label>
                  <input
                    required
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    className={inputClass}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="customer">Customer</option>
                    <option value="franchise">Franchise</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Company Name</label>
                  <input
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">GST Number</label>
                  <input
                    value={createForm.gstNumber}
                    onChange={(e) => setCreateForm((p) => ({ ...p, gstNumber: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                  <input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
                  <textarea
                    rows={2}
                    value={createForm.address}
                    onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                    className={textareaClass}
                  />
                </div>
                {createError && (
                  <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {createError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex h-[42px] items-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {creating ? "Creating…" : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError("");
                      setCreateForm(EMPTY_FORM);
                    }}
                    className="inline-flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  filter === item.id
                    ? "text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200"
                }`}
                style={filter === item.id ? { backgroundColor: NAVY } : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-600">{emptyMessage.title}</p>
              <p className="mt-1 text-xs text-slate-400">{emptyMessage.hint}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredUsers.map((user) => {
                const pending = isPending(user);
                return (
                  <article
                    key={user.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      pending ? "border-yellow-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold" style={{ color: NAVY }}>
                          {user.name}
                        </h2>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                        {pending && (
                          <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                            Role: {user.role}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(user)}`}
                      >
                        {roleLabel(user)}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-400">Company</dt>
                        <dd className="truncate">{user.companyName || "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-400">Phone</dt>
                        <dd>{user.phone || "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-400">GST</dt>
                        <dd className="truncate">{user.gstNumber || "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-400">Address</dt>
                        <dd className="line-clamp-2">{user.address || "—"}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {pending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(user)}
                            disabled={actionId === user.id}
                            className="rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(user)}
                            disabled={actionId === user.id}
                            className="rounded-lg border border-red-200 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            disabled={actionId === user.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={actionId === user.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={actionId === user.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                              user.isActive
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={actionId === user.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !savingEdit && setEditingUser(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id="edit-user-title" className="text-lg font-bold" style={{ color: NAVY }}>
              Edit user
            </h3>
            <form onSubmit={handleEditSave} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                <input readOnly value={editForm.email} className={`${inputClass} cursor-not-allowed bg-slate-100`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
                <input readOnly value={editForm.role} className={`${inputClass} cursor-not-allowed bg-slate-100`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Company Name</label>
                <input
                  value={editForm.companyName}
                  onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">GST Number</label>
                <input
                  value={editForm.gstNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, gstNumber: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  className={textareaClass}
                />
              </div>
              {editError && (
                <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: NAVY }}
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
