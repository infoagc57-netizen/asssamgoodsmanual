import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["customer", "franchise"]);

function serializeUser(doc) {
  if (!doc) return null;
  const row = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(row._id),
    name: row.name || "",
    email: row.email || "",
    role: row.role || "",
    companyName: row.companyName || "",
    gstNumber: row.gstNumber || "",
    phone: row.phone || "",
    address: row.address || "",
    isActive: row.isActive !== false,
    status: row.status || "active",
    failedLoginCount: row.failedLoginCount ?? 0,
    lastLoginAt: row.lastLoginAt || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET(req) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");

  const query = { role: { $in: ["customer", "franchise"] } };
  if (roleFilter && ALLOWED_ROLES.has(roleFilter)) {
    query.role = roleFilter;
  }

  const users = await User.find(query)
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users: users.map(serializeUser) });
}

export async function POST(req) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await dbConnect();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await User.create({
    name,
    email,
    passwordHash,
    role,
    companyName,
    gstNumber,
    phone,
    address,
    isActive: true,
    status: "active",
    failedLoginCount: 0,
  });

  return NextResponse.json({ user: serializeUser(created) }, { status: 201 });
}
