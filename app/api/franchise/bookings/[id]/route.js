import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { serializeBooking } from "@/lib/serializeBooking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const key = decodeURIComponent(id || "").trim();
  if (!key) {
    return NextResponse.json({ error: "Booking id required" }, { status: 400 });
  }

  await dbConnect();

  const franchiseId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;

  const query = { franchiseId };
  if (mongoose.Types.ObjectId.isValid(key)) {
    query.$or = [{ _id: key }, { lrNumber: key }];
  } else {
    query.lrNumber = key;
  }

  const booking = await Booking.findOne(query).lean();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: serializeBooking(booking) });
}
