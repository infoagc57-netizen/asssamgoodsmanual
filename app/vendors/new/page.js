"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_vendors";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const initialForm = {
  name: "",
  mobile: "",
  alternateMobile: "",
  gst: "",
  pan: "",
  city: "",
  branch: "",
  paymentTerms: "",
  status: "Active",
};

const nextVendorId = (vendors) => {
  const next = vendors.reduce((max, vendor) => Math.max(max, Number(String(vendor.id).replace("VND", "")) || 0), 0) + 1;
  return `VND${String(next).padStart(4, "0")}`;
};

const isDuplicateActive = (vendors, candidate, excludeId) => {
  if (candidate.status !== "Active") return false;
  const mobile = String(candidate.mobile || "");
  const gst = String(candidate.gst || "").trim().toLowerCase();
  return vendors.some((vendor) => {
    if (vendor.id === excludeId || (vendor.status || "Active") !== "Active") return false;
    if (vendor.mobile === mobile) return true;
    if (gst && String(vendor.gst || "").trim().toLowerCase() === gst) return true;
    return false;
  });
};

export default function NewVendorPage() {
  const [form, setForm] = useState(initialForm);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setBranches((JSON.parse(window.localStorage.getItem("agc_branches") || "[]")).filter((branch) => branch.status !== "Disabled"));
  }, []);

  const update = (field) => (event) => {
    const value = field.toLowerCase().includes("mobile")
      ? event.target.value.replace(/\D/g, "").slice(0, 10)
      : event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const save = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const mobile = form.mobile.replace(/\D/g, "");
    if (!name) {
      setError("Vendor name is required.");
      return;
    }
    if (mobile.length !== 10) {
      setError("Mobile number must be 10 digits.");
      return;
    }
    if (!form.branch) {
      setError("Branch is required.");
      return;
    }

    const vendors = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const branch = branches.find((item) => item.code === form.branch || item.id === form.branch);
    const record = {
      id: nextVendorId(vendors),
      name,
      mobile,
      alternateMobile: form.alternateMobile.replace(/\D/g, "").slice(0, 10),
      gst: form.gst.trim(),
      pan: form.pan.trim(),
      city: form.city.trim(),
      branch: form.branch,
      branchName: branch?.name || form.branch,
      paymentTerms: form.paymentTerms.trim(),
      status: form.status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDuplicateActive(vendors, record)) {
      setError("An active vendor already exists with this mobile or GST number.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...vendors, record]));
    window.location.href = `/vendors/${record.id}`;
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <a href="/vendors" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vendor Master / New</a>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Add Vendor</h1>
          <p className="mt-1 text-sm text-slate-500">Create a hire-vehicle vendor account.</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Basic Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Vendor Name *
                <input required className={`${inputClass} mt-1.5`} value={form.name} onChange={update("name")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Mobile Number *
                <input required className={`${inputClass} mt-1.5`} inputMode="numeric" value={form.mobile} onChange={update("mobile")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Alternate Mobile
                <input className={`${inputClass} mt-1.5`} inputMode="numeric" value={form.alternateMobile} onChange={update("alternateMobile")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">GST Number
                <input className={`${inputClass} mt-1.5`} value={form.gst} onChange={update("gst")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">PAN Number
                <input className={`${inputClass} mt-1.5`} value={form.pan} onChange={update("pan")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">City
                <input className={`${inputClass} mt-1.5`} value={form.city} onChange={update("city")} />
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Operations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Branch *
                <select required className={`${inputClass} mt-1.5`} value={form.branch} onChange={update("branch")}>
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.code || branch.id}>{branch.name} ({branch.code})</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Payment Terms
                <input className={`${inputClass} mt-1.5`} placeholder="e.g. 15 days" value={form.paymentTerms} onChange={update("paymentTerms")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Status
                <select className={`${inputClass} mt-1.5`} value={form.status} onChange={update("status")}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
          </section>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(initialForm)} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Reset</button>
            <button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Vendor</button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
