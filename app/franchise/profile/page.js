"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-500";

const emptyProfile = {
  name: "",
  email: "",
  role: "",
  phone: "",
  companyName: "",
  gstNumber: "",
  panNumber: "",
  address: "",
};

export default function FranchiseProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/franchise/profile", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        if (!cancelled) {
          const next = { ...emptyProfile, ...data.user };
          setProfile(next);
          setForm(next);
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = {
            ...emptyProfile,
            name: session?.user?.name || "",
            email: session?.user?.email || "",
            role: session?.user?.role || "franchise",
          };
          setProfile(fallback);
          setForm(fallback);
          setError(err.message || "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.name, session?.user?.email, session?.user?.role]);

  const startEdit = () => {
    setForm(profile);
    setEditing(true);
    setMessage("");
    setError("");
  };

  const cancelEdit = () => {
    setForm(profile);
    setEditing(false);
    setError("");
  };

  const handleChange = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/franchise/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          companyName: form.companyName,
          address: form.address,
          gstNumber: form.gstNumber,
          panNumber: form.panNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      const next = { ...emptyProfile, ...data.user };
      setProfile(next);
      setForm(next);
      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["Name", "name"],
    ["Email", "email"],
    ["Role", "role"],
    ["Company Name", "companyName"],
    ["Phone", "phone"],
    ["GST Number", "gstNumber"],
    ["PAN Number", "panNumber"],
    ["Address", "address"],
  ];

  return (
    <FranchiseLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              Account
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
              Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500">Your franchise account details.</p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071B34] text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: NAVY }}>
                {loading ? "Loading…" : profile.name || "Franchise"}
              </p>
              <p className="text-sm text-slate-500">{profile.email || "—"}</p>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={form.name} onChange={handleChange("name")} required />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} value={form.phone} onChange={handleChange("phone")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Company Name</label>
                <input className={inputClass} value={form.companyName} onChange={handleChange("companyName")} />
              </div>
              <div>
                <label className={labelClass}>GST Number</label>
                <input className={inputClass} value={form.gstNumber} onChange={handleChange("gstNumber")} />
              </div>
              <div>
                <label className={labelClass}>PAN Number</label>
                <input className={inputClass} value={form.panNumber} onChange={handleChange("panNumber")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  value={form.address}
                  onChange={handleChange("address")}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: ORANGE }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([label, key]) => (
                <div key={key} className={key === "address" ? "sm:col-span-2" : undefined}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {loading ? "…" : profile[key] || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </FranchiseLayout>
  );
}
