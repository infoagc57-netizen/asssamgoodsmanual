import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import EmailOtp from "@/models/EmailOtp";
import User from "@/models/User";
import { generateOtp, sendOtpEmail } from "@/lib/emailService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const purpose = String(body?.purpose || "signup").trim().toLowerCase();
  const userName = String(body?.userName || "").trim();

  // Validate email
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  // Validate purpose
  if (!["signup", "forgot_password"].includes(purpose)) {
    return NextResponse.json(
      { error: 'purpose must be "signup" or "forgot_password".' },
      { status: 400 },
    );
  }

  await dbConnect();

  // For signup: check if email already exists
  if (purpose === "signup") {
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered. Please login instead." },
        { status: 400 },
      );
    }
  }

  // For forgot_password: check if email exists
  if (purpose === "forgot_password") {
    const existingUser = await User.findOne({ email }).lean();
    if (!existingUser) {
      // Don't reveal whether email exists for security
      return NextResponse.json({
        success: true,
        message: "If this email is registered, you will receive an OTP shortly.",
      });
    }
  }

  // Rate limiting: check if OTP was sent recently (within 60 seconds)
  const recentOtp = await EmailOtp.findOne({
    email,
    purpose,
    created_at: { $gte: new Date(Date.now() - RATE_LIMIT_SECONDS * 1000) },
  }).lean();

  if (recentOtp) {
    const secondsRemaining = Math.ceil(
      (new Date(recentOtp.created_at).getTime() +
        RATE_LIMIT_SECONDS * 1000 -
        Date.now()) /
        1000,
    );
    return NextResponse.json(
      {
        error: `Please wait ${secondsRemaining} seconds before requesting a new OTP.`,
      },
      { status: 429 },
    );
  }

  // Generate OTP
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Delete old OTPs for this email + purpose
  await EmailOtp.deleteMany({ email, purpose });

  // Save new OTP
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const userAgent = req.headers.get("user-agent") || "";

  await EmailOtp.create({
    email,
    otp,
    purpose,
    expiresAt,
    ipAddress,
    userAgent,
  });

  // Send email
  try {
    await sendOtpEmail({ to: email, otp, purpose, userName });
  } catch (err) {
    console.error("[send-otp] Email failed:", err);
    // Clean up OTP if email failed
    await EmailOtp.deleteMany({ email, purpose });
    return NextResponse.json(
      { error: "Failed to send OTP email. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `OTP sent to ${email}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });
}