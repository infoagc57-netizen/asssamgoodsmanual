"use client";

import { useEffect, useRef, useState } from "react";

export default function PartySearchSelect({
  partyType = "all",
  onSelect,
  placeholder = "Select saved party…",
  inputClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const fetchParties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ partyType, limit: "50" });
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/parties?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setParties(res.ok ? data.parties || [] : []);
      } catch {
        if (!cancelled) setParties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = window.setTimeout(fetchParties, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, partyType]);

  useEffect(() => {
    const handler = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (party) => {
    onSelect?.(party);
    setOpen(false);
    setQuery("");
  };

  const triggerClass = inputClassName
    || "flex h-[42px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm hover:border-orange-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate text-slate-600">{placeholder}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, mobile, city…"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto" role="listbox">
            {loading && (
              <div className="p-3 text-center text-xs text-slate-400">Loading…</div>
            )}

            {!loading && parties.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No saved parties yet. Fill the form and click &quot;Save as Party&quot;.
              </div>
            )}

            {!loading && parties.map((party) => (
              <button
                key={party.id}
                type="button"
                onClick={() => handleSelect(party)}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-orange-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {party.name || "Unnamed"}
                  </span>
                  {party.mobile && (
                    <span className="shrink-0 text-xs text-slate-500">{party.mobile}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {[party.city, party.state].filter(Boolean).join(", ")}
                  {party.gst && ` · GST: ${party.gst}`}
                  {party.idType && party.idNumber && ` · ${party.idType}: ${party.idNumber}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
