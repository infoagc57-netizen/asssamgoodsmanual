import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import EmailOtp from "@/models/EmailOtp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const otp = String(body?.otp || "").trim();
  const purpose = String(body?.purpose || "signup").trim().toLowerCase();

  if (!email || !otp) {
    return NextResponse.json(
      { error: "Email and OTP are required." },
      { status: 400 },
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { error: "OTP must be 6 digits." },
      { status: 400 },
    );
  }

  if (!["signup", "forgot_password"].includes(purpose)) {
    return NextResponse.json(
      { error: 'purpose must be "signup" or "forgot_password".' },
      { status: 400 },
    );
  }

  await dbConnect();

  const record = await EmailOtp.findOne({ email, purpose }).sort({
    created_at: -1,
  });

  if (!record) {
    return NextResponse.json(
      { error: "No OTP found for this email. Please request a new one." },
      { status: 400 },
    );
  }

  // Check if already used
  if (record.usedAt) {
    return NextResponse.json(
      { error: "This OTP has already been used. Please request a new one." },
      { status: 400 },
    );
  }

  // Check expiry
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "OTP has expired. Please request a new one." },
      { status: 400 },
    );
  }

  // Check attempts
  if (record.attempts >= record.maxAttempts) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please request a new OTP." },
      { status: 429 },
    );
  }

  // Check OTP
  if (String(record.otp) !== otp) {
    record.attempts = (record.attempts || 0) + 1;
    await record.save();

    const remaining = record.maxAttempts - record.attempts;
    return NextResponse.json(
      {
        error: `Incorrect OTP. ${remaining} attempts remaining.`,
      },
      { status: 400 },
    );
  }

  // Success — mark OTP as verified + used
  record.verified = true;
  record.usedAt = new Date();
  await record.save();

  return NextResponse.json({
    success: true,
    message: "OTP verified successfully.",
  });
}