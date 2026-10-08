"use client";

import { Clock } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const NAVY = "#071B34";
const ORANGE = "#F97316";

export default function PendingApprovalPage() {
  const { data: session, status } = useSession();
  const email = session?.user?.email || "—";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>
            Assam Goods Carrier
          </h1>
          <p className="mt-1 text-sm text-slate-500">Account Verification</p>
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <Clock className="h-16 w-16" style={{ color: ORANGE }} strokeWidth={1.5} aria-hidden />

          <h2 className="mt-5 text-2xl font-bold" style={{ color: NAVY }}>
            Account Pending Approval
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Thank you for registering! Your account is currently under review. Our admin team will
            approve it shortly. You will be able to access your dashboard once approved.
          </p>

          <div className="mt-5 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {status === "loading" ? (
              <span>Loading session…</span>
            ) : (
              <>
                <span className="text-slate-400">Registered Email: </span>
                <span className="font-medium text-slate-800 break-all">{email}</span>
              </>
            )}
          </div>

          <div className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            ⏱ Usually takes 1-24 hours. For urgent approval, call us at{" "}
            <a href="tel:8847428801" className="font-semibold underline underline-offset-2">
              8847428801
            </a>
            .
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-[42px] w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            Refresh Status
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
