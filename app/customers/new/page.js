"use client";

import { useState } from "react";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
const initialForm = { name: "", mobile: "", alternateMobile: "", gst: "", pan: "", address: "", pincode: "", city: "", state: "Assam", customerType: "Regular", defaultPayment: "to_pay", remarks: "" };

export default function NewCustomerPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: field.toLowerCase().includes("mobile") ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value }));

  const saveCustomer = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const mobile = form.mobile.replace(/\D/g, "");
    if (!name || !mobile) { setError("Customer name and mobile are required."); return; }
    const customers = JSON.parse(window.localStorage.getItem("agc_customers") || "[]");
    if (customers.some((customer) => customer.mobile === mobile)) { setError("A customer with this mobile number already exists."); return; }
    const nextNumber = customers.reduce((max, customer) => Math.max(max, Number(String(customer.id).replace("CUST", "")) || 0), 0) + 1;
    const customer = { ...form, name, mobile, id: `CUST${String(nextNumber).padStart(4, "0")}`, createdAt: new Date().toISOString() };
    window.localStorage.setItem("agc_customers", JSON.stringify([...customers, customer]));
    window.location.href = `/customers/${customer.id}`;
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><div className="mb-6"><a href="/customers" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Customer Master / New</a><h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Add Customer</h1><p className="mt-1 text-sm text-slate-500">Create a reusable customer account for booking operations.</p></div><form onSubmit={saveCustomer} className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Basic Details</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Customer Name *<input required className={`${inputClass} mt-1.5`} value={form.name} onChange={update("name")} /></label><label className="text-xs font-semibold text-slate-700">Mobile *<input required className={`${inputClass} mt-1.5`} inputMode="numeric" value={form.mobile} onChange={update("mobile")} /></label><label className="text-xs font-semibold text-slate-700">Alternate Mobile<input className={`${inputClass} mt-1.5`} inputMode="numeric" value={form.alternateMobile} onChange={update("alternateMobile")} /></label><label className="text-xs font-semibold text-slate-700">GST Number<input className={`${inputClass} mt-1.5`} value={form.gst} onChange={update("gst")} /></label><label className="text-xs font-semibold text-slate-700">PAN<input className={`${inputClass} mt-1.5`} value={form.pan} onChange={update("pan")} /></label></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Address</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Full Address<textarea className="mt-1.5 min-h-[90px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" value={form.address} onChange={update("address")} /></label><label className="text-xs font-semibold text-slate-700">Pincode<input className={`${inputClass} mt-1.5`} value={form.pincode} onChange={update("pincode")} /></label><label className="text-xs font-semibold text-slate-700">City<input className={`${inputClass} mt-1.5`} value={form.city} onChange={update("city")} /></label><label className="text-xs font-semibold text-slate-700">State<input className={`${inputClass} mt-1.5`} value={form.state} onChange={update("state")} /></label></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Business</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Customer Type<select className={`${inputClass} mt-1.5`} value={form.customerType} onChange={update("customerType")}><option>Regular</option><option>Cash</option><option>Party</option></select></label><label className="text-xs font-semibold text-slate-700">Default Payment<select className={`${inputClass} mt-1.5`} value={form.defaultPayment} onChange={update("defaultPayment")}><option value="to_pay">To Pay</option><option value="paid">Paid</option><option value="tbb">TBB</option></select></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Remarks<textarea className="mt-1.5 min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" value={form.remarks} onChange={update("remarks")} /></label></div></section>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(initialForm)} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Reset</button><button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Customer</button></div>
  </form></div></main>;
}
