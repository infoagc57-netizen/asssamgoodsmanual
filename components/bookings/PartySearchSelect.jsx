"use client";

import { useEffect, useRef, useState } from "react";

export default function PartySearchSelect({
  partyType,
  onSelect,
  placeholder = "Search saved party…",
  inputClassName = "",
}) {
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ partyType, limit: "15" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/parties?${params.toString()}`);
        const data = await response.json();
        setOptions(response.ok ? data.parties || [] : []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, partyType, open]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const pickParty = (party) => {
    onSelect(party);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && (
            <p className="px-3 py-2 text-xs text-slate-500">Searching parties…</p>
          )}
          {!loading && options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No saved parties found.</p>
          )}
          {!loading && options.map((party) => (
            <button
              key={party.id}
              type="button"
              onClick={() => pickParty(party)}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2 text-left text-sm last:border-0 hover:bg-orange-50"
            >
              <span className="min-w-0 truncate font-semibold text-slate-800">{party.name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {[party.mobile, party.city].filter(Boolean).join(" · ") || "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
