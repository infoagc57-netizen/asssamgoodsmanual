"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

function formatCreatedAt(user) {
  const raw = user?.created_at || user?.createdAt;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(raw);
  }
}

export default function ProfileSettings() {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load profile");
      }
      setProfile(data.user);
      setName(data.user?.name || "");
      setEmail(data.user?.email || "");
    } catch (err) {
      setLoadError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }
      setProfile(data.user);
      setProfileMessage(data.message || "Profile updated");
      await updateSession({
        user: {
          name: data.user?.name,
          email: data.user?.email,
        },
      });
    } catch (err) {
      setProfileError(err.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password update failed");
      }
      setPasswordMessage(data.message || "Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Loading profile…</p>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  const userId = profile?.id || session?.user?.id || "—";
  const role = profile?.role || session?.user?.role || "—";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
          Account details
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">User ID</dt>
            <dd className="mt-1 break-all text-sm font-medium text-slate-800">{userId}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</dt>
            <dd className="mt-1 text-sm font-medium capitalize text-slate-800">{role}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Created</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{formatCreatedAt(profile)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
          Profile
        </h2>
        <p className="mt-1 text-sm text-slate-500">Update your display name and login email.</p>
        <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4 max-w-lg">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
              autoComplete="email"
            />
          </div>
          {profileError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</p>
          )}
          {profileMessage && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{profileMessage}</p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ORANGE }}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
          Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">Enter your current password to set a new one.</p>
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4 max-w-lg">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{passwordMessage}</p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {savingPassword ? "Updating…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
