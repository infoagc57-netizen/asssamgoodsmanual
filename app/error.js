"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-card">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#071B34]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#F97316] px-6 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
