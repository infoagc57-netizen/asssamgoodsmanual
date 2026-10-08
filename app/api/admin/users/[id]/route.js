import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function PATCH(req, { params }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.name !== undefined) {
    user.name = String(body.name).trim();
  }
  if (body.companyName !== undefined) {
    user.companyName = String(body.companyName).trim();
  }
  if (body.gstNumber !== undefined) {
    user.gstNumber = String(body.gstNumber).trim().toUpperCase();
  }
  if (body.phone !== undefined) {
    user.phone = String(body.phone).trim();
  }
  if (body.address !== undefined) {
    user.address = String(body.address).trim();
  }
  if (body.isActive !== undefined) {
    user.isActive = Boolean(body.isActive);
  }
  if (body.status !== undefined) {
    user.status = String(body.status).trim();
  }

  if (body.password !== undefined && String(body.password).length > 0) {
    user.passwordHash = await bcrypt.hash(String(body.password), 10);
  }

  await user.save();

  const updated = await User.findById(id).select("-passwordHash").lean();
  return NextResponse.json({ user: serializeUser(updated) });
}

export async function DELETE(_req, { params }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
