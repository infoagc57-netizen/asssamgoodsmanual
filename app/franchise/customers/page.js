"use client";

import { useEffect, useState } from "react";
import FranchiseLayout from "@/components/layout/FranchiseLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

export default function FranchiseCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchGst, setSearchGst] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/franchise/customers", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load customers");
        if (!cancelled) setCustomers(data.customers || []);
      } catch (err) {
        if (!cancelled) {
          setCustomers([]);
          setError(err.message || "Failed to load customers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCustomers = customers.filter(
    (customer) =>
      String(customer.name || "").toLowerCase().includes(searchName.toLowerCase()) &&
      String(customer.mobile || "").includes(searchMobile) &&
      String(customer.gst || "").toLowerCase().includes(searchGst.toLowerCase()),
  );

  return (
    <FranchiseLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
                Franchise
              </p>
              <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
                My Customers
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Parties you have saved while creating bookings.
              </p>
            </div>
            <a
              href="/franchise/bookings/new"
              className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              + New Booking
            </a>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
            <input
              className={inputClass}
              placeholder="Search by name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Search by mobile"
              inputMode="numeric"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, ""))}
            />
            <input
              className={inputClass}
              placeholder="Search by GST"
              value={searchGst}
              onChange={(e) => setSearchGst(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {["Customer ID", "Customer Name", "Mobile", "GST", "City", "Total Bookings", "Actions"].map(
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
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-16 text-center text-sm text-slate-500">
                        Loading customers…
                      </td>
                    </tr>
                  ) : filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-orange-50/30">
                        <td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>
                          {String(customer.id).slice(-8).toUpperCase()}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">{customer.name}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{customer.mobile || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{customer.gst || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{customer.city || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{customer.totalBookings || 0}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">
                          <a
                            className="text-slate-500 hover:text-orange-600"
                            href={`/franchise/bookings/new?customer=${encodeURIComponent(customer.id)}`}
                          >
                            New Booking
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-20 text-center">
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>
                          No customers found.
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Save a party while creating a booking to build your customer list.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </FranchiseLayout>
  );
}
