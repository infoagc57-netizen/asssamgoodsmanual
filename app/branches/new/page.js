"use client";

import { useState } from "react";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
const initialForm = { name: "", code: "", city: "", state: "Assam", manager: "", mobile: "", email: "", address: "", pincode: "", status: "Active" };

export default function NewBranchPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: field === "mobile" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value }));

  const saveBranch = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) { setError("Branch Name is required."); return; }
    const branches = JSON.parse(window.localStorage.getItem("agc_branches") || "[]");
    if (branches.some((branch) => branch.code.toUpperCase() === code)) { setError("Branch Code must be unique."); return; }
    const nextNumber = branches.reduce((max, branch) => Math.max(max, Number(String(branch.id).replace("BR", "")) || 0), 0) + 1;
    const branch = { ...form, name, code, id: `BR${String(nextNumber).padStart(3, "0")}`, createdAt: new Date().toISOString() };
    window.localStorage.setItem("agc_branches", JSON.stringify([...branches, branch]));
    window.location.href = `/branches/${branch.id}`;
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><div className="mb-6"><a href="/branches" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Branch Master / New</a><h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Add Branch</h1><p className="mt-1 text-sm text-slate-500">Create an operating branch for AGC route management.</p></div><form onSubmit={saveBranch} className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Branch Information</h2><div className="grid gap-4 sm:grid-cols-2">{[["Branch Name", "name", true], ["Branch Code", "code", true], ["City", "city"], ["State", "state"], ["Manager", "manager"], ["Mobile", "mobile"], ["Email", "email"], ["Pincode", "pincode"]].map(([label, field, required]) => <label key={field} className="text-xs font-semibold text-slate-700">{label}{required && " *"}<input required={required} className={`${inputClass} mt-1.5`} value={form[field]} onChange={update(field)} /></label>)}<label className="text-xs font-semibold text-slate-700 sm:col-span-2">Address<textarea className="mt-1.5 min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white" value={form.address} onChange={update("address")} /></label></div></section>{error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(initialForm)} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Reset</button><button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Branch</button></div></form></div></main>;
}
