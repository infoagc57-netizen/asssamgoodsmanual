"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { TRACKING_EVENTS } from "@/lib/trackingEvents";

const NAVY = "#071B34";
const ORANGE = "#F97316";
const inputClass =
  "h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";
const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

function toLocalDateTimeValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatStamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function queueStatusLabel(status) {
  if (status === "checking") return { text: "Checking…", className: "text-slate-500" };
  if (status === "valid") return { text: "✓ Found", className: "text-emerald-600 font-semibold" };
  if (status === "not_found") return { text: "✗ Not found", className: "text-red-600 font-semibold" };
  return { text: status, className: "text-slate-600" };
}

export default function TrackingUpdatesPage() {
  const [mode, setMode] = useState("single");

  const [event, setEvent] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [timestamp, setTimestamp] = useState(() => toLocalDateTimeValue());

  const [singleLr, setSingleLr] = useState("");
  const [lrQuery, setLrQuery] = useState("");
  const [bookings, setBookings] = useState([]);
  const [showLrSuggestions, setShowLrSuggestions] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lrInput, setLrInput] = useState("");
  const [queue, setQueue] = useState([]);
  const [queueWarning, setQueueWarning] = useState("");
  const [applying, setApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const inputRef = useRef(null);

  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings?limit=500");
      const data = await res.json();
      if (res.ok) {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      }
    } catch {
      setBookings([]);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/tracking-updates?limit=20");
      const data = await res.json();
      if (res.ok) {
        setRecentUpdates(Array.isArray(data.updates) ? data.updates : []);
      }
    } catch {
      setRecentUpdates([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "single") {
      loadBookings();
    }
    loadRecent();
  }, [loadBookings, loadRecent, mode]);

  useEffect(() => {
    if (mode === "multi") {
      inputRef.current?.focus();
    }
  }, [mode]);

  const lrSuggestions = useMemo(() => {
    const q = lrQuery.trim().toLowerCase();
    if (!q) return bookings.slice(0, 8);
    return bookings
      .filter((b) => String(b.lrNumber || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [bookings, lrQuery]);

  const selectBooking = (booking) => {
    setSingleLr(booking.lrNumber);
    setLrQuery(booking.lrNumber);
    setShowLrSuggestions(false);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const key = singleLr.trim() || lrQuery.trim();
    if (!key) {
      setFormError("Select or enter an LR number.");
      return;
    }
    if (!event) {
      setFormError("Select an event.");
      return;
    }
    if (!location.trim()) {
      setFormError("Enter a location.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tracking-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lrNumber: key,
          event,
          location: location.trim(),
          note: note.trim(),
          timestamp: new Date(timestamp).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add update");
      }
      setFormSuccess(data.message || "Tracking update added");
      setNote("");
      setEvent("");
      setLocation("");
      setSingleLr("");
      setLrQuery("");
      setTimestamp(toLocalDateTimeValue());
      await loadRecent();
    } catch (err) {
      setFormError(err.message || "Failed to add update");
    } finally {
      setSubmitting(false);
    }
  };

  const addLrToQueue = async () => {
    const lr = lrInput.trim();
    if (!lr) return;

    setQueueWarning("");
    if (queue.some((q) => q.lr === lr)) {
      setQueueWarning("Already added");
      setLrInput("");
      inputRef.current?.focus();
      return;
    }

    setQueue((prev) => [...prev, { lr, status: "checking" }]);
    setLrInput("");
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/bookings/validate-lrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lrNumbers: [lr] }),
      });
      const data = await res.json();
      const isValid = Array.isArray(data.valid) && data.valid.includes(lr);
      setQueue((prev) =>
        prev.map((q) => (q.lr === lr ? { ...q, status: isValid ? "valid" : "not_found" } : q)),
      );
    } catch {
      setQueue((prev) =>
        prev.map((q) => (q.lr === lr ? { ...q, status: "not_found" } : q)),
      );
    }
  };

  const handleQueueKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLrToQueue();
    }
  };

  const removeFromQueue = (lr) => {
    setQueue((prev) => prev.filter((q) => q.lr !== lr));
  };

  const validCount = queue.filter((q) => q.status === "valid").length;
  const invalidCount = queue.filter((q) => q.status === "not_found").length;
  const checkingCount = queue.filter((q) => q.status === "checking").length;

  const applyBulkUpdate = async () => {
    const validLrs = queue.filter((q) => q.status === "valid").map((q) => q.lr);
    if (validLrs.length === 0 || !event || !location.trim()) {
      setBulkResult({
        error: !event
          ? "Select a status/event before applying."
          : !location.trim()
            ? "Enter a location before applying."
            : "Add at least one valid LR to the queue.",
      });
      return;
    }

    setApplying(true);
    setBulkResult(null);

    try {
      const res = await fetch("/api/tracking-updates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lrNumbers: validLrs,
          event,
          location: location.trim(),
          note: note.trim(),
          timestamp: new Date(timestamp).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply updates");
      }
      const skipped = Number(data.skipped) || validLrs.length - (Number(data.success) || 0);
      setBulkResult({
        success: Number(data.success) || 0,
        skipped,
        message: data.message || `${data.success} updated, ${skipped} skipped`,
      });
      setQueue([]);
      setQueueWarning("");
      await loadRecent();
    } catch (err) {
      setBulkResult({ success: 0, skipped: validLrs.length, error: err.message });
    } finally {
      setApplying(false);
      inputRef.current?.focus();
    }
  };

  const modeButtonClass = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active
        ? "text-white shadow-sm"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <AppLayout>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>Operations</p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>Tracking Updates</h1>
            <p className="mt-1 text-sm text-slate-500">Add shipment tracking events by LR number.</p>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setBulkResult(null);
                setQueueWarning("");
              }}
              className={modeButtonClass(mode === "single")}
              style={mode === "single" ? { backgroundColor: NAVY } : undefined}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("multi");
                setFormError("");
                setFormSuccess("");
              }}
              className={modeButtonClass(mode === "multi")}
              style={mode === "multi" ? { backgroundColor: NAVY } : undefined}
            >
              Multi LR
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {mode === "single" ? (
                <>
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Add update</h2>
                  <form onSubmit={handleSingleSubmit} className="mt-4 space-y-4">
                    <div className="relative">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        LR number
                      </label>
                      <input
                        type="text"
                        value={lrQuery}
                        onChange={(e) => {
                          setLrQuery(e.target.value);
                          setSingleLr(e.target.value);
                          setShowLrSuggestions(true);
                        }}
                        onFocus={() => setShowLrSuggestions(true)}
                        placeholder="Search or type LR number"
                        className={inputClass}
                        autoComplete="off"
                      />
                      {showLrSuggestions && lrSuggestions.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-10 cursor-default"
                            aria-label="Close suggestions"
                            onClick={() => setShowLrSuggestions(false)}
                          />
                          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            {lrSuggestions.map((b) => (
                              <li key={b.lrNumber}>
                                <button
                                  type="button"
                                  onClick={() => selectBooking(b)}
                                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-orange-50"
                                >
                                  <span className="text-sm font-bold text-slate-900">LR {b.lrNumber}</span>
                                  <span className="text-xs text-slate-500">
                                    {b.consignor?.name || "—"} → {b.consignee?.name || "—"}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Status / event
                      </label>
                      <select value={event} onChange={(e) => setEvent(e.target.value)} className={inputClass} required>
                        <option value="">Select event</option>
                        {TRACKING_EVENTS.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Branch or city"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Date &amp; time
                      </label>
                      <input
                        type="datetime-local"
                        value={timestamp}
                        onChange={(e) => setTimestamp(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Note (optional)
                      </label>
                      <textarea
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional remark"
                        className={textareaClass}
                      />
                    </div>

                    {formError && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
                    )}
                    {formSuccess && (
                      <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{formSuccess}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-[42px] items-center justify-center rounded-xl px-6 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {submitting ? "Saving…" : "Add update"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
                      Common details
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Set status and location once, then add LR numbers below.</p>
                    <div className="mt-4 space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          Status / event *
                        </label>
                        <select value={event} onChange={(e) => setEvent(e.target.value)} className={inputClass}>
                          <option value="">Select event</option>
                          {TRACKING_EVENTS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          Location *
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Branch or city"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          Date &amp; time
                        </label>
                        <input
                          type="datetime-local"
                          value={timestamp}
                          onChange={(e) => setTimestamp(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          Note (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional remark"
                          className={textareaClass}
                        />
                      </div>
                      {queue.length > 0 && (
                        <p className="text-xs font-medium text-amber-700">
                          Status change applies to all queued LRs.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Add LR numbers</h2>
                    <p className="mt-1 text-xs text-slate-500">Type or paste an LR, then press Enter or click Add.</p>
                    <div className="mt-3 flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={lrInput}
                        onChange={(e) => setLrInput(e.target.value)}
                        onKeyDown={handleQueueKeyDown}
                        placeholder="LR number"
                        className={inputClass}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={addLrToQueue}
                        className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Add
                      </button>
                    </div>
                    {queueWarning && (
                      <p className="mt-2 text-sm font-medium text-amber-700">{queueWarning}</p>
                    )}
                  </div>

                  {queue.length > 0 && (
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>LR queue</h2>
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            <tr>
                              <th className="px-3 py-2 w-10">#</th>
                              <th className="px-3 py-2">LR number</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 w-16 text-right">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {queue.map((item, index) => {
                              const status = queueStatusLabel(item.status);
                              return (
                                <tr key={item.lr}>
                                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-900">{item.lr}</td>
                                  <td className={`px-3 py-2 text-xs ${status.className}`}>{status.text}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeFromQueue(item.lr)}
                                      className="rounded-lg px-2 py-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                      aria-label={`Remove ${item.lr}`}
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {validCount} valid{invalidCount ? `, ${invalidCount} invalid` : ""}
                        {checkingCount ? `, ${checkingCount} checking` : ""}
                      </p>
                    </div>
                  )}

                  {bulkResult && (
                    <p
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        bulkResult.error
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-green-200 bg-green-50 text-green-800"
                      }`}
                    >
                      {bulkResult.error || bulkResult.message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={applyBulkUpdate}
                    disabled={applying || validCount === 0}
                    className="inline-flex h-[42px] items-center justify-center rounded-xl px-6 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {applying ? "Applying…" : `Apply to ${validCount} booking${validCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>Recent updates</h2>
              {loadingRecent ? (
                <p className="mt-4 text-sm text-slate-500">Loading…</p>
              ) : recentUpdates.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {recentUpdates.map((row, index) => (
                    <li key={`${row.lrNumber}-${row.id || index}-${row.createdAt}`} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/bookings/${encodeURIComponent(row.lrNumber)}`}
                            className="text-sm font-bold hover:text-orange-600"
                            style={{ color: NAVY }}
                          >
                            LR {row.lrNumber}
                          </Link>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">{row.event}</p>
                          <p className="text-xs text-slate-500">{row.location}</p>
                          {row.remark ? <p className="mt-1 text-xs text-slate-600">{row.remark}</p> : null}
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-400">{formatStamp(row.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No tracking updates yet.</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
