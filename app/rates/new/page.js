"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const RATE_TYPES = ["Per Kg", "Per Package", "Fixed"];
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  customerId: "",
  generalRate: false,
  fromBranch: "",
  toBranch: "",
  rateType: "Per Kg",
  rate: "",
  minFreight: "0",
  effectiveFrom: "",
  status: "Active",
};

export default function NewRatePage() {
  const [form, setForm] = useState({ ...initialForm, effectiveFrom: today() });
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomers(JSON.parse(window.localStorage.getItem("agc_customers") || "[]"));
    setBranches((JSON.parse(window.localStorage.getItem("agc_branches") || "[]")).filter((branch) => branch.status !== "Disabled"));
  }, []);

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((previous) => {
      if (field === "generalRate" && value) return { ...previous, generalRate: true, customerId: "" };
      return { ...previous, [field]: value };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    const rateValue = Number(form.rate);
    const minFreight = form.minFreight === "" ? 0 : Number(form.minFreight);
    if (!form.generalRate && !form.customerId) {
      setError("Select a customer or mark this as a General Rate.");
      return;
    }
    if (!form.fromBranch || !form.toBranch || !form.rateType) {
      setError("From Branch, To Branch and Rate Type are required.");
      return;
    }
    if (form.fromBranch === form.toBranch) {
      setError("From Branch and To Branch cannot be the same.");
      return;
    }
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      setError("Rate must be greater than 0.");
      return;
    }
    if (!Number.isFinite(minFreight) || minFreight < 0) {
      setError("Minimum Freight cannot be negative.");
      return;
    }

    const customer = customers.find((item) => item.id === form.customerId);
    const from = branches.find((item) => item.code === form.fromBranch || item.id === form.fromBranch);
    const to = branches.find((item) => item.code === form.toBranch || item.id === form.toBranch);

    try {
      const response = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.generalRate ? "" : form.customerId,
          customerName: form.generalRate ? "General Rate" : customer?.name || "",
          generalRate: Boolean(form.generalRate),
          fromBranch: form.fromBranch,
          fromBranchName: from?.name || form.fromBranch,
          toBranch: form.toBranch,
          toBranchName: to?.name || form.toBranch,
          rateType: form.rateType,
          rate: rateValue,
          minFreight,
          effectiveFrom: form.effectiveFrom || today(),
          status: form.status || "Active",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save rate.");
        return;
      }
      window.location.href = `/rates/${data.rate.id}`;
    } catch {
      setError("Could not save rate.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <a href="/rates" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rate Master / New</a>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Add Rate</h1>
          <p className="mt-1 text-sm text-slate-500">Create a customer-specific or general freight rate.</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Party &amp; Route</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Customer{!form.generalRate && " *"}
                <select className={`${inputClass} mt-1.5`} value={form.customerId} onChange={update("customerId")} disabled={form.generalRate}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.id})</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.generalRate} onChange={update("generalRate")} className="h-4 w-4 rounded border-slate-300" style={{ accentColor: ORANGE }} />
                General Rate
              </label>
              <label className="text-xs font-semibold text-slate-700">From Branch *
                <select required className={`${inputClass} mt-1.5`} value={form.fromBranch} onChange={update("fromBranch")}>
                  <option value="">Select from branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.code || branch.id}>{branch.name} ({branch.code})</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">To Branch *
                <select required className={`${inputClass} mt-1.5`} value={form.toBranch} onChange={update("toBranch")}>
                  <option value="">Select to branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.code || branch.id}>{branch.name} ({branch.code})</option>)}
                </select>
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Tariff</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Rate Type *
                <select required className={`${inputClass} mt-1.5`} value={form.rateType} onChange={update("rateType")}>
                  {RATE_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Rate *
                <input required type="number" min="0.01" step="0.01" className={`${inputClass} mt-1.5`} value={form.rate} onChange={update("rate")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Minimum Freight
                <input type="number" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={form.minFreight} onChange={update("minFreight")} />
              </label>
              <label className="text-xs font-semibold text-slate-700">Effective From
                <input type="date" className={`${inputClass} mt-1.5`} value={form.effectiveFrom} onChange={update("effectiveFrom")} />
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
            <button type="button" onClick={() => setForm({ ...initialForm, effectiveFrom: today() })} className="h-[42px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Reset</button>
            <button type="submit" className="h-[42px] rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Rate</button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
