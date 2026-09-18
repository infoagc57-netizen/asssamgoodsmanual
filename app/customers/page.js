"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchGst, setSearchGst] = useState("");
  const [bookingCount, setBookingCount] = useState({});

  useEffect(() => {
    try {
      const savedCustomers = JSON.parse(window.localStorage.getItem("agc_customers") || "[]");
      const bookings = JSON.parse(window.localStorage.getItem("agc_bookings") || "[]");
      setCustomers(savedCustomers);
      setBookingCount(bookings.reduce((counts, booking) => {
        const name = booking.consignor?.name?.toLowerCase();
        if (name) counts[name] = (counts[name] || 0) + 1;
        return counts;
      }, {}));
    } catch {
      setCustomers([]);
    }
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchName.toLowerCase()) &&
    customer.mobile.includes(searchMobile) &&
    (customer.gst || "").toLowerCase().includes(searchGst.toLowerCase())
  );

  return (
    <AppLayout>
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p><h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Customer Master</h1><p className="mt-1 text-sm text-slate-500">Manage consignor and consignee accounts for AGC operations.</p></div>
          <a href="/customers/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Customer</a>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
          <input className={inputClass} placeholder="Search by name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
          <input className={inputClass} placeholder="Search by mobile" inputMode="numeric" value={searchMobile} onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, ""))} />
          <input className={inputClass} placeholder="Search by GST" value={searchGst} onChange={(e) => setSearchGst(e.target.value)} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Customer ID", "Customer Name", "Mobile", "GST", "City", "Total Bookings", "Outstanding", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length ? filteredCustomers.map((customer) => <tr key={customer.id} className="hover:bg-orange-50/30"><td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{customer.id}</td><td className="px-5 py-4 text-sm font-semibold text-slate-800">{customer.name}</td><td className="px-5 py-4 text-sm text-slate-600">{customer.mobile}</td><td className="px-5 py-4 text-sm text-slate-600">{customer.gst || "-"}</td><td className="px-5 py-4 text-sm text-slate-600">{customer.city || "-"}</td><td className="px-5 py-4 text-sm text-slate-700">{bookingCount[customer.name.toLowerCase()] || 0}</td><td className="px-5 py-4 text-sm font-semibold text-slate-700">₹0.00</td><td className="whitespace-nowrap px-5 py-4 text-xs font-bold"><a className="mr-3 text-[#0B1F33] hover:text-orange-600" href={`/customers/${customer.id}`}>View</a><a className="mr-3 text-slate-500 hover:text-orange-600" href={`/customers/${customer.id}?edit=true`}>Edit</a><a className="text-slate-500 hover:text-orange-600" href={`/bookings/new?customer=${customer.id}`}>New Booking</a></td></tr>) : <tr><td colSpan="8" className="px-5 py-20 text-center"><div className="text-sm font-semibold" style={{ color: NAVY }}>No customers found.</div><p className="mt-1 text-xs text-slate-500">Add a customer to start building your master data.</p></td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    </main>
    </AppLayout>
  );
}
