import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
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
  const newPassword = String(body?.newPassword || "");

  if (!email || !newPassword) {
    return NextResponse.json(
      { error: "Email and new password are required." },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  await dbConnect();

  // Check if OTP was verified for this email + forgot_password
  const otpRecord = await EmailOtp.findOne({
    email,
    purpose: "forgot_password",
  }).sort({ created_at: -1 });

  if (!otpRecord) {
    return NextResponse.json(
      { error: "Please verify your email with OTP first." },
      { status: 400 },
    );
  }

  if (!otpRecord.verified) {
    return NextResponse.json(
      { error: "Email not verified. Please verify OTP first." },
      { status: 400 },
    );
  }

  // Check if OTP verified recently (within 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (new Date(otpRecord.usedAt) < fifteenMinutesAgo) {
    return NextResponse.json(
      { error: "Verification expired. Please verify OTP again." },
      { status: 400 },
    );
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;
  user.failedLoginCount = 0;
  await user.save();

  // Delete OTP records for cleanup
  await EmailOtp.deleteMany({ email, purpose: "forgot_password" });

  return NextResponse.json({
    success: true,
    message: "Password reset successful. You can now login with your new password.",
  });
}