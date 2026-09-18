"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";
import { partyNameOf, syncLedger } from "../page";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const inputClass = "mt-1.5 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white";

const readList = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const allocatePayment = (entries, customerId, lrNumber, amount) => {
  let remaining = Number(amount || 0);
  const targets = entries
    .filter((entry) => entry.customerId === customerId && Number(entry.balance || 0) > 0 && entry.kind !== "paid")
    .filter((entry) => !lrNumber || entry.lrNumber === lrNumber)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const allocations = [];
  targets.forEach((entry) => {
    if (remaining <= 0) return;
    const apply = Math.min(Number(entry.balance || 0), remaining);
    if (apply <= 0) return;
    allocations.push({ lrNumber: entry.lrNumber, amount: Number(apply.toFixed(2)) });
    remaining = Number((remaining - apply).toFixed(2));
  });
  return { allocations, leftover: remaining };
};

export default function PaymentPage() {
  const [customers, setCustomers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    lrNumber: "",
    amount: "",
    mode: "Cash",
    reference: "",
    date: new Date().toISOString().slice(0, 10),
    remarks: "",
  });
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const entries = syncLedger();
    const master = readList("agc_customers");
    const bookings = readList("agc_bookings");
    const extras = [];
    bookings.forEach((booking) => {
      const name = partyNameOf(booking);
      if (!name || master.some((item) => normalize(item.name) === normalize(name))) return;
      const id = `PARTY:${normalize(name)}`;
      if (extras.some((item) => item.id === id)) return;
      extras.push({ id, name, mobile: booking.consignee?.mobile || booking.consignor?.mobile || "" });
    });
    setCustomers([...master, ...extras]);
    setLedger(entries);
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("customerId") || "";
    const lrNumber = params.get("lr") || "";
    setForm((previous) => ({ ...previous, customerId, lrNumber }));
  }, []);

  const selected = customers.find((item) => item.id === form.customerId);
  const openEntries = ledger.filter((entry) => entry.customerId === form.customerId && Number(entry.balance || 0) > 0 && entry.kind !== "paid");
  const selectedEntry = openEntries.find((entry) => entry.lrNumber === form.lrNumber);
  const outstanding = selectedEntry ? Number(selectedEntry.balance || 0) : openEntries.reduce((total, entry) => total + Number(entry.balance || 0), 0);
  const matches = customers.filter((customer) => !form.customerId && search && [customer.name, customer.mobile, customer.gst, customer.id].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))).slice(0, 6);

  const fillFull = () => {
    if (outstanding > 0) setForm((previous) => ({ ...previous, amount: outstanding.toFixed(2) }));
  };

  const save = (event) => {
    event.preventDefault();
    setError("");
    if (!selected) {
      setError("Customer is required.");
      return;
    }
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (amount - outstanding > 0.009) {
      setError("Amount cannot exceed outstanding balance.");
      return;
    }
    const current = syncLedger();
    const { allocations, leftover } = allocatePayment(current, selected.id, form.lrNumber, amount);
    if (!allocations.length || leftover > 0.009) {
      setError(form.lrNumber ? "This LR has no remaining balance." : "No outstanding LRs for this customer.");
      return;
    }
    const applied = allocations.reduce((total, item) => total + Number(item.amount || 0), 0);
    const payments = readList("agc_payments");
    const receiptNumber = `REC${String(payments.length + 1).padStart(6, "0")}`;
    const payment = {
      receiptNumber,
      customerId: selected.id,
      customerName: selected.name,
      lrNumber: allocations.length === 1 ? allocations[0].lrNumber : form.lrNumber,
      allocations,
      amount: Number(applied.toFixed(2)),
      mode: form.mode,
      reference: form.reference,
      date: form.date,
      remarks: form.remarks,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem("agc_payments", JSON.stringify([...payments, payment]));
    const nextLedger = syncLedger();
    setLedger(nextLedger);
    setReceipt(payment);
  };

  const paidKindHint = useMemo(() => {
    if (!selectedEntry) return form.lrNumber ? "" : (openEntries.length ? `${openEntries.length} LR(s) · ${money(outstanding)} outstanding` : "No outstanding LRs");
    return `${selectedEntry.type} · ${selectedEntry.status} · ${money(selectedEntry.balance)} due`;
  }, [selectedEntry, form.lrNumber, openEntries, outstanding]);

  if (receipt) {
    return (
      <AppLayout>
        <main className="payment-screen min-h-screen bg-slate-50 px-4 py-6">
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Payment Saved</h1>
            <p className="mt-2 text-sm text-slate-500">Receipt {receipt.receiptNumber} created for {receipt.customerName}{receipt.amount ? ` · ${money(receipt.amount)}` : ""}.</p>
            <p className="mt-2 text-xs text-slate-500">{receipt.allocations?.map((item) => `${item.lrNumber} ${money(item.amount)}`).join(" · ")}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Print Receipt</button>
              <a href="/accounts" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">View Ledger</a>
            </div>
          </div>
        </main>
        <section className="payment-receipt">
          <div>
            <img src="/brand/agc-logo.jpg" alt="Assam Goods Carrier" className="receipt-logo" />
            <h1>ASSAM GOODS CARRIER</h1>
            <p>SAFE • RELIABLE • ON TIME</p>
            <h2>PAYMENT RECEIPT</h2>
            <p>Receipt No: {receipt.receiptNumber}</p>
            <p>Customer: {receipt.customerName}</p>
            <p>Amount Received: {money(receipt.amount)}</p>
            <p>Payment Mode: {receipt.mode}</p>
            <p>Reference Number: {receipt.reference || "-"}</p>
            <p>Payment Date: {receipt.date}</p>
            <p>LR Allocation: {receipt.allocations?.map((item) => `${item.lrNumber} ${money(item.amount)}`).join(", ") || "-"}</p>
            <div className="receipt-signature">Clerk Signature</div>
          </div>
          <style jsx global>{`.payment-receipt{display:none}@media print{@page{size:A5 portrait;margin:10mm}.payment-screen{display:none!important}.payment-receipt{display:block!important;color:#071B34;font-family:Arial,Helvetica,sans-serif}.payment-receipt>div{border:1px solid #071B34;padding:10mm}.receipt-logo{display:block;height:18mm;width:auto;margin:0 auto 4mm}.payment-receipt h1{text-align:center;font-size:16pt;letter-spacing:1mm}.payment-receipt h2{text-align:center;color:#F97316;font-size:12pt;letter-spacing:1mm}.payment-receipt p{border-bottom:1px solid #cbd5e1;padding:4mm 0;font-size:10pt}.receipt-signature{margin-top:30mm;border-top:1px solid #071B34;padding-top:4mm;text-align:center;font-size:8pt}}`}</style>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="mb-6">
            <a href="/accounts" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Accounts / Payment</a>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: NAVY }}>Receive Payment</h1>
            <p className="mt-1 text-sm text-slate-500">Post a full or partial collection. Balance updates on the LR ledger automatically.</p>
          </div>
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="relative block text-xs font-semibold text-slate-700">Customer
              <input
                value={search || selected?.name || ""}
                onChange={(e) => { setSearch(e.target.value); setForm((previous) => ({ ...previous, customerId: "", lrNumber: "", amount: "" })); }}
                placeholder="Search customer"
                className={inputClass}
              />
              {matches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 overflow-hidden rounded-xl border bg-white shadow-lg">
                  {matches.map((customer) => (
                    <button key={customer.id} type="button" onClick={() => { setForm((previous) => ({ ...previous, customerId: customer.id, lrNumber: "", amount: "" })); setSearch(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50">{customer.name} · {customer.mobile || customer.id}</button>
                  ))}
                </div>
              )}
            </label>

            <label className="mt-4 block text-xs font-semibold">LR Number
              <select value={form.lrNumber} onChange={(e) => setForm((previous) => ({ ...previous, lrNumber: e.target.value, amount: "" }))} className={inputClass}>
                <option value="">All outstanding LRs (FIFO)</option>
                {openEntries.map((entry) => (
                  <option key={entry.lrNumber} value={entry.lrNumber}>{entry.lrNumber} · {entry.type} · {money(entry.balance)}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{paidKindHint}</p>
            </label>

            <label className="mt-4 block text-xs font-semibold">Amount
              <input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm((previous) => ({ ...previous, amount: e.target.value }))} className={inputClass} />
            </label>
            <button type="button" onClick={fillFull} disabled={outstanding <= 0} className="mt-2 text-xs font-bold text-orange-600 disabled:opacity-40">Use full outstanding {outstanding > 0 ? `(${money(outstanding)})` : ""}</button>

            <label className="mt-4 block text-xs font-semibold">Payment Mode
              <select value={form.mode} onChange={(e) => setForm((previous) => ({ ...previous, mode: e.target.value }))} className={inputClass}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
              </select>
            </label>
            {[["Reference Number", "reference", "text"], ["Payment Date", "date", "date"], ["Remarks", "remarks", "text"]].map(([label, field, type]) => (
              <label key={field} className="mt-4 block text-xs font-semibold">{label}
                <input type={type} value={form[field]} onChange={(e) => setForm((previous) => ({ ...previous, [field]: e.target.value }))} className={inputClass} />
              </label>
            ))}
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <a href="/accounts" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold">Cancel</a>
              <button className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>Save Payment</button>
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
