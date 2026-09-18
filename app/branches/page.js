"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass = "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");

  const loadBranches = () => setBranches(JSON.parse(window.localStorage.getItem("agc_branches") || "[]"));
  useEffect(() => { loadBranches(); }, []);

  const disableBranch = (id) => {
    const updated = branches.map((branch) => branch.id === id ? { ...branch, status: "Disabled" } : branch);
    window.localStorage.setItem("agc_branches", JSON.stringify(updated));
    setBranches(updated);
  };

  const visibleBranches = branches.filter((branch) => [branch.code, branch.name, branch.city, branch.manager].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));

  return <AppLayout><main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Master Data</p><h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Branch Master</h1><p className="mt-1 text-sm text-slate-500">Manage AGC operating branches and route availability.</p></div><a href="/branches/new" className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: ORANGE }}>+ Add Branch</a></div><div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input className={inputClass} placeholder="Search branch code, name, city or manager" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Branch Code", "Branch Name", "City", "Manager", "Contact", "Status", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleBranches.length ? visibleBranches.map((branch) => <tr key={branch.id} className="hover:bg-orange-50/30"><td className="px-5 py-4 text-sm font-bold" style={{ color: NAVY }}>{branch.code}</td><td className="px-5 py-4 text-sm font-semibold text-slate-800">{branch.name}</td><td className="px-5 py-4 text-sm text-slate-600">{branch.city}</td><td className="px-5 py-4 text-sm text-slate-600">{branch.manager || "-"}</td><td className="px-5 py-4 text-sm text-slate-600">{branch.mobile || "-"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${branch.status === "Disabled" ? "bg-slate-100 text-slate-500" : "bg-green-50 text-green-700"}`}>{branch.status || "Active"}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs font-bold"><a href={`/branches/${branch.id}`} className="mr-3 text-[#0B1F33] hover:text-orange-600">View</a><a href={`/branches/${branch.id}?edit=true`} className="mr-3 text-slate-500 hover:text-orange-600">Edit</a>{branch.status !== "Disabled" && <button type="button" onClick={() => disableBranch(branch.id)} className="text-slate-500 hover:text-red-600">Disable</button>}</td></tr>) : <tr><td colSpan="7" className="px-5 py-20 text-center text-sm font-semibold" style={{ color: NAVY }}>No branches found.</td></tr>}</tbody></table></div></div></div></main></AppLayout>;
}
