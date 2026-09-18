"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_vendors";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

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

export default function VendorDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const editing = searchParams.get("edit") === "true";
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const vendors = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const record = vendors.find((item) => item.id === decodeURIComponent(params?.id || ""));
    setVendor(record || null);
    setBranches((JSON.parse(window.localStorage.getItem("agc_branches") || "[]")).filter((branch) => branch.status !== "Disabled"));
    if (record) {
      setForm({
        name: record.name || "",
        mobile: record.mobile || "",
        alternateMobile: record.alternateMobile || "",
        gst: record.gst || "",
        pan: record.pan || "",
        city: record.city || "",
        branch: record.branch || "",
        paymentTerms: record.paymentTerms || "",
        status: record.status || "Active",
      });
    }
  }, [params]);

  const update = (field) => (event) => {
    const value = field.toLowerCase().includes("mobile")
      ? event.target.value.replace(/\D/g, "").slice(0, 10)
      : event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const save = (event) => {
    event.preventDefault();
    if (!vendor || !form) return;
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
    const nextRecord = {
      ...vendor,
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
      createdAt: vendor.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (isDuplicateActive(vendors, nextRecord, vendor.id)) {
      setError("An active vendor already exists with this mobile or GST number.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors.map((item) => item.id === vendor.id ? nextRecord : item)));
    window.location.href = `/vendors/${vendor.id}`;
  };

  if (!vendor) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Vendor not found</h1>
            <a href="/vendors" className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Back to Vendors</a>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a href="/vendors" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vendor Master / Details</a>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>{vendor.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{vendor.id} · {vendor.mobile} · {vendor.branchName || vendor.branch}</p>
          </div>
          <div className="flex gap-2">
            <a href="/vendors" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back</a>
            {!editing && <a href={`/vendors/${vendor.id}?edit=true`} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Edit Vendor</a>}
          </div>
        </div>

        {editing && form ? (
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
                  <input className={`${inputClass} mt-1.5`} value={form.paymentTerms} onChange={update("paymentTerms")} />
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
              <a href={`/vendors/${vendor.id}`} className="inline-flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Cancel</a>
              <button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Changes</button>
            </div>
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Vendor Information</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Vendor Code", vendor.id],
                ["Vendor Name", vendor.name],
                ["Mobile", vendor.mobile],
                ["Alternate Mobile", vendor.alternateMobile],
                ["GST Number", vendor.gst],
                ["PAN Number", vendor.pan],
                ["City", vendor.city],
                ["Branch", vendor.branchName || vendor.branch],
                ["Payment Terms", vendor.paymentTerms],
                ["Status", vendor.status || "Active"],
                ["Created", vendor.createdAt ? new Date(vendor.createdAt).toLocaleString("en-IN") : "-"],
                ["Updated", vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleString("en-IN") : "-"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
