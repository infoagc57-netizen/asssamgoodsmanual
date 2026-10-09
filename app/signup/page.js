"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputClass =
  "block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100";

const EMPTY_FORM = {
  role: "customer",
  name: "",
  email: "",
  password: "",
  companyName: "",
  gstNumber: "",
  panNumber: "",
  phone: "",
  address: "",
};

export default function SignupPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const setField = (field) => (e) => {
    let value = e.target.value;
    if (field === "gstNumber" || field === "panNumber") {
      value = value.toUpperCase();
    }
    if (field === "email") {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
      setOtpError("");
      setOtpSuccess("");
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendOtp = async () => {
    setOtpError("");
    setOtpSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      setOtpError("Please enter your name first.");
      return;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      setOtpError("Please enter a valid email address.");
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup", userName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }
      setOtpSent(true);
      setOtpVerified(false);
      setOtpSuccess(`OTP sent to ${email}. Check your inbox (and spam).`);
      setResendTimer(60);
    } catch (err) {
      setOtpError(err.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    setOtpSuccess("");

    if (!otp || !/^\d{6}$/.test(otp)) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }

    setOtpVerifying(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          otp,
          purpose: "signup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }
      setOtpVerified(true);
      setOtpSuccess("✅ Email verified successfully!");
    } catch (err) {
      setOtpError(err.message || "Verification failed");
      setOtpVerified(false);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const phone = form.phone.trim();
    const gstNumber = form.gstNumber.trim();
    const panNumber = form.panNumber.trim();

    if (!name || !email || !password || !form.role) {
      setError("Name, email, password, and role are required.");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!phone) {
      setError("Phone number is required");
      return;
    }

    if (!gstNumber && !panNumber) {
      setError("Please provide either GST or PAN Number");
      return;
    }

    if (!otpVerified) {
      setError("Please verify your email with OTP first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          name,
          email,
          password,
          companyName: form.role === "customer" ? form.companyName.trim() : "",
          gstNumber,
          panNumber,
          phone,
          address: form.address.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="text-center">
          <img
            src="/brand/agc-logo.jpg"
            alt="Assam Goods Carrier"
            className="mx-auto h-14 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="mt-3 text-xl font-bold" style={{ color: NAVY }}>
            Assam Goods Carrier
          </h1>
          <p className="mt-1 text-sm text-slate-500">Customer &amp; Franchise Registration</p>
        </div>

        {success ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold leading-relaxed text-emerald-800">
              ✅ Account created! Please wait for admin approval. You will be able to login once approved.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Role <span style={{ color: ORANGE }}>*</span>
              </label>
              <select
                required
                value={form.role}
                onChange={setField("role")}
                className={inputClass}
              >
                <option value="customer">Customer</option>
                <option value="franchise">Franchise</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Name <span style={{ color: ORANGE }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={setField("name")}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Email <span style={{ color: ORANGE }}>*</span>
              </label>
              <div className="flex gap-2">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="you@example.com"
                  disabled={otpVerified}
                  className={`${inputClass} flex-1 ${otpVerified ? "bg-emerald-50 border-emerald-300" : ""}`}
                />
                {otpVerified ? (
                  <div
                    className="flex items-center justify-center rounded-xl px-4 text-sm font-semibold text-emerald-700"
                    style={{ backgroundColor: "#d1fae5" }}
                  >
                    ✓ Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || resendTimer > 0}
                    className="inline-flex h-auto items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: NAVY }}
                  >
                    {otpSending
                      ? "Sending..."
                      : resendTimer > 0
                        ? `Resend ${resendTimer}s`
                        : otpSent
                          ? "Resend OTP"
                          : "Send OTP"}
                  </button>
                )}
              </div>

              {otpSent && !otpVerified && (
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-orange-800">
                    Enter the 6-digit OTP sent to your email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="block flex-1 rounded-xl border border-orange-200 bg-white py-2.5 px-3 text-center text-lg font-bold tracking-widest text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otp.length !== 6}
                      className="inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {otpVerifying ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </div>
              )}

              {otpError && (
                <p className="mt-2 text-xs font-medium text-red-600">{otpError}</p>
              )}
              {otpSuccess && !otpError && (
                <p className="mt-2 text-xs font-medium text-emerald-600">{otpSuccess}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Password <span style={{ color: ORANGE }}>*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  value={form.password}
                  onChange={setField("password")}
                  placeholder="At least 6 characters"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {form.role === "customer" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Company Name
                </label>
                <input
                  value={form.companyName}
                  onChange={setField("companyName")}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                GST Number (Optional)
              </label>
              <input
                value={form.gstNumber}
                onChange={setField("gstNumber")}
                placeholder="Optional (or provide PAN)"
                className={inputClass}
                style={{ textTransform: "uppercase" }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                PAN Number (Optional)
              </label>
              <input
                value={form.panNumber}
                onChange={setField("panNumber")}
                placeholder="Optional (or provide GST)"
                className={inputClass}
                style={{ textTransform: "uppercase" }}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Either GST Number or PAN Number is required.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Phone <span style={{ color: ORANGE }}>*</span>
              </label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={setField("phone")}
                placeholder="Required (10 digits)"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Address
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={setField("address")}
                placeholder="Optional"
                className={`${inputClass} min-h-[72px] resize-y`}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: ORANGE, boxShadow: "0 8px 20px -6px rgba(249,115,22,0.5)" }}
            >
              {loading ? "Creating Account..." : !otpVerified ? "Verify Email First" : "Create Account"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: ORANGE }}>
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}