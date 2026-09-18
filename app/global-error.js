"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-navy-50/30 px-6">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-navy-900">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-navy-500">
              {error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <button
              onClick={() => reset()}
              className="mt-8 btn-primary"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
