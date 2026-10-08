import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["customer", "franchise"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const role = String(body?.role || "").trim();
  const companyName = String(body?.companyName || "").trim();
  const gstNumber = String(body?.gstNumber || "").trim().toUpperCase();
  const phone = String(body?.phone || "").trim();
  const address = String(body?.address || "").trim();

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "name, email, password, and role are required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'role must be "customer" or "franchise".' },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  await dbConnect();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    passwordHash,
    role,
    companyName,
    gstNumber,
    phone,
    address,
    isActive: false,
    status: "pending_approval",
    failedLoginCount: 0,
  });

  return NextResponse.json({
    success: true,
    message: "Signup successful. Please wait for admin approval.",
  });
}
