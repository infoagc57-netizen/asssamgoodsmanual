import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Manifest from "@/models/Manifest";
import Booking from "@/models/Booking";
import { serializeManifest } from "@/lib/manifestService";
import { serializeBooking } from "@/lib/serializeBooking";

export const dynamic = "force-dynamic";

function manifestQuery(id) {
  const key = decodeURIComponent(id || "").trim();
  if (mongoose.Types.ObjectId.isValid(key)) {
    return { $or: [{ _id: key }, { manifestNumber: key }] };
  }
  return { manifestNumber: key };
}

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const manifest = await Manifest.findOne(manifestQuery(params.id)).lean();
  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }

  const bookings = await Booking.find({ lrNumber: { $in: manifest.lrNumbers || [] } }).lean();
  const bookingMap = new Map(bookings.map((b) => [b.lrNumber, b]));
  const orderedBookings = (manifest.lrNumbers || [])
    .map((lr) => bookingMap.get(lr))
    .filter(Boolean)
    .map(serializeBooking);

  return NextResponse.json({
    manifest: serializeManifest(manifest),
    bookings: orderedBookings,
  });
}

export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const manifest = await Manifest.findOne(manifestQuery(params.id));
  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }

  await Booking.updateMany(
    { manifestId: manifest._id },
    {
      $set: { status: "Booked" },
      $unset: { manifestId: "", manifestNumber: "" },
    },
  );

  await manifest.deleteOne();

  return NextResponse.json({ message: "Manifest deleted" });
}
