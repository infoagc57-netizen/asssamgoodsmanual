import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    phone: user.phone || "",
    companyName: user.companyName || "",
    gstNumber: user.gstNumber || "",
    panNumber: user.panNumber || "",
    address: user.address || "",
    status: user.status || "",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(user) });
}

export async function PATCH(req) {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = {};
  if (body.name !== undefined) updates.name = String(body.name || "").trim();
  if (body.phone !== undefined) updates.phone = String(body.phone || "").trim();
  if (body.companyName !== undefined) updates.companyName = String(body.companyName || "").trim();
  if (body.address !== undefined) updates.address = String(body.address || "").trim();
  if (body.gstNumber !== undefined) updates.gstNumber = String(body.gstNumber || "").trim().toUpperCase();
  if (body.panNumber !== undefined) updates.panNumber = String(body.panNumber || "").trim().toUpperCase();

  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(session.user.id, { $set: updates }, { new: true }).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(user) });
}
