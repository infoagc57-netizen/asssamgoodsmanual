import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { serializeBooking } from "@/lib/serializeBooking";

export const dynamic = "force-dynamic";

function decodeLr(lrNumber) {
  return decodeURIComponent(lrNumber || "");
}

// GET /api/bookings/:lrNumber
export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lrNumber } = await params;
  await dbConnect();

  const booking = await Booking.findOne({ lrNumber: decodeLr(lrNumber) }).lean();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: serializeBooking(booking) });
}

// PUT /api/bookings/:lrNumber
export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lrNumber } = await params;
  const key = decodeLr(lrNumber);
  const body = await req.json();

  await dbConnect();

  const {
    _id,
    lrNumber: _ignoredLr,
    createdBy: _ignoredCreatedBy,
    ...updates
  } = body;

  const booking = await Booking.findOneAndUpdate(
    { lrNumber: key },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: serializeBooking(booking) });
}

// DELETE /api/bookings/:lrNumber
export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lrNumber } = await params;
  await dbConnect();

  const deleted = await Booking.findOneAndDelete({ lrNumber: decodeLr(lrNumber) }).lean();
  if (!deleted) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: serializeBooking(deleted) });
}
