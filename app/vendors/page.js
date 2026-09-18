"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const STORAGE_KEY = "agc_vendors";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    try {
      setVendors(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      setVendors([]);
    }
  }, []);

  const disableVendor = (id) => {
    const updated = vendors.map((vendor) => vendor.id === id ? { ...vendor, status: "Inactive", updatedAt: new Date().toISOString() } : vendor);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setVendors(updated);
  };

  const visible = vendors.filter((vendor) => {
    const query = search.toLowerCase();
    const matchesSearch = !query
      || String(vendor.name || "").toLowerCase().includes(query)
      || String(vendor.mobile || "").includes(query)
      || String(vendor.gst || "").toLowerCase().includes(query);
    return matchesSearch && (!statusFilter || vendor.status === statusFilter);
  });

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Vendor Master</h1>
              <p className="mt-1 text-sm text-slate-500">Manage hire-vehicle vendors for AGC operations.</p>
            </div>
            <a href="/vendors/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Vendor</a>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <input className={inputClass} placeholder="Search vendor name, mobile or GST" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Vendor Code", "Vendor Name", "Mobile", "Branch", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length ? visible.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-orange-50/30">
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{vendor.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{vendor.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{vendor.mobile}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{vendor.branchName || vendor.branch || "-"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vendor.status === "Inactive" ? "bg-slate-100 text-slate-500" : "bg-green-50 text-green-700"}`}>{vendor.status || "Active"}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                        <a href={`/vendors/${vendor.id}`} className="mr-3 text-[#0B1F33] hover:text-orange-600">View</a>
                        <a href={`/vendors/${vendor.id}?edit=true`} className="mr-3 text-slate-500 hover:text-orange-600">Edit</a>
                        {vendor.status !== "Inactive" && (
                          <button type="button" onClick={() => disableVendor(vendor.id)} className="text-slate-500 hover:text-red-600">Disable</button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>No vendors found.</div>
                        <p className="mt-1 text-xs text-slate-500">Add a vendor to start building hire-vehicle master data.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
