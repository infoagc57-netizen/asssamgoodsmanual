"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const defaultInputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

const isExactPincode = (value) => /^\d{6}$/.test(String(value || "").trim());
const isPartialPincode = (value) => /^\d{1,5}$/.test(String(value || "").trim());

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Search or type…",
  allowCustom = true,
  inputClassName = defaultInputClass,
  name,
  id,
  onFocus,
  onPincodeDetected,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const raw = String(query || "").trim();
    if (isExactPincode(raw) || isPartialPincode(raw)) return [];
    const needle = raw.toLowerCase();
    if (!needle) return options.slice(0, 50);
    return options.filter((option) => String(option).toLowerCase().includes(needle)).slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    if (highlightIndex >= filtered.length) setHighlightIndex(0);
  }, [filtered, highlightIndex]);

  const selectOption = (option) => {
    setQuery(option);
    onChange(option);
    setOpen(false);
  };

  const commitCustomValue = () => {
    if (!allowCustom) return;
    const next = String(query || "").trim();
    onChange(next);
    setOpen(false);
  };

  const detectPincodeFromQuery = () => {
    const trimmed = String(query || "").trim();
    if (!onPincodeDetected || !isExactPincode(trimmed)) return false;
    setOpen(false);
    onPincodeDetected(trimmed);
    return true;
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    const trimmed = next.trim();
    if (onPincodeDetected && isExactPincode(trimmed)) {
      setOpen(false);
      onPincodeDetected(trimmed);
      return;
    }
    setOpen(!isPartialPincode(trimmed));
    if (allowCustom) onChange(next);
  };

  const handleBlur = (event) => {
    if (containerRef.current?.contains(event.relatedTarget)) return;
    setOpen(false);
    if (detectPincodeFromQuery()) return;
    if (allowCustom) commitCustomValue();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlightIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (detectPincodeFromQuery()) return;
      if (open && filtered[highlightIndex]) {
        selectOption(filtered[highlightIndex]);
        return;
      }
      commitCustomValue();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        className={inputClassName}
        onChange={handleInputChange}
        onFocus={(event) => {
          setOpen(true);
          onFocus?.(event);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.length ? filtered.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              role="option"
              aria-selected={index === highlightIndex}
              className={`flex w-full px-3 py-2 text-left text-sm ${
                index === highlightIndex ? "bg-orange-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              {option}
            </button>
          )) : (
            <p className="px-3 py-2 text-xs text-slate-500">
              No match — you can still type manually
            </p>
          )}
        </div>
      )}
    </div>
  );
}
