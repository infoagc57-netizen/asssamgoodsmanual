"use client";

import { useSession } from "next-auth/react";

export default function SessionGate({ children }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
        </div>

        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  return children;
}
