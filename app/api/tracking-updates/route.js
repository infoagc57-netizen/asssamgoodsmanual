import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { serializeBooking } from "@/lib/serializeBooking";
import { appendTrackingEntry } from "@/lib/appendTrackingUpdate";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

  await dbConnect();

  const updates = await Booking.aggregate([
    { $match: { trackingHistory: { $exists: true, $ne: [] } } },
    { $unwind: "$trackingHistory" },
    {
      $project: {
        _id: 0,
        lrNumber: 1,
        id: { $ifNull: ["$trackingHistory.id", ""] },
        status: { $ifNull: ["$trackingHistory.status", "$trackingHistory.event"] },
        event: { $ifNull: ["$trackingHistory.event", "$trackingHistory.status", "Update"] },
        location: { $ifNull: ["$trackingHistory.location", "$trackingHistory.branch", ""] },
        branch: { $ifNull: ["$trackingHistory.branch", "$trackingHistory.location", ""] },
        note: { $ifNull: ["$trackingHistory.note", "$trackingHistory.remark", ""] },
        remark: { $ifNull: ["$trackingHistory.remark", "$trackingHistory.note", ""] },
        timestamp: {
          $ifNull: [
            "$trackingHistory.timestamp",
            "$trackingHistory.createdAt",
          ],
        },
        createdAt: {
          $ifNull: [
            "$trackingHistory.createdAt",
            "$trackingHistory.timestamp",
          ],
        },
      },
    },
    { $match: { timestamp: { $ne: null } } },
    { $sort: { timestamp: -1 } },
    { $limit: limit },
  ]);

  return NextResponse.json({ updates });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const lrNumber = String(body.lrNumber || "").trim();
  const event = String(body.event || "").trim();
  const location = String(body.location || "").trim();
  const remark = String(body.note ?? body.remark ?? "").trim();
  const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

  if (!lrNumber) {
    return NextResponse.json({ error: "LR number is required" }, { status: 400 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }
  if (Number.isNaN(timestamp.getTime())) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  await dbConnect();

  const booking = await Booking.findOne({ lrNumber });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  appendTrackingEntry(booking, { event, location, remark, timestamp });
  await booking.save();

  return NextResponse.json({
    booking: serializeBooking(booking.toObject()),
    message: "Tracking update added",
  });
}
