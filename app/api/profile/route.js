import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

function serializeUser(doc) {
  if (!doc) return null;
  return doc.toJSON ? doc.toJSON() : doc;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("-passwordHash");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(user) });
}

export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email } = body;

  await dbConnect();

  const update = {};
  if (name && String(name).trim()) {
    update.name = String(name).trim();
  }

  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const existing = await User.findOne({ email: cleanEmail, _id: { $ne: session.user.id } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use by another account" }, { status: 409 });
    }
    update.email = cleanEmail;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(session.user.id, update, { new: true, runValidators: true }).select("-passwordHash");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(user), message: "Profile updated successfully" });
}
