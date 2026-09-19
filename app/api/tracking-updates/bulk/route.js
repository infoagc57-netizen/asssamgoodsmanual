import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { appendTrackingEntry } from "@/lib/appendTrackingUpdate";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const event = String(body.event || "").trim();
  const location = String(body.location || "").trim();
  const remark = String(body.note ?? body.remark ?? "").trim();
  const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
  const raw = Array.isArray(body.lrNumbers) ? body.lrNumbers : [];
  const lrNumbers = [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];

  if (!lrNumbers.length) {
    return NextResponse.json({ error: "At least one LR number is required" }, { status: 400 });
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

  let success = 0;
  const failed = [];

  for (const lrNumber of lrNumbers) {
    try {
      const booking = await Booking.findOne({ lrNumber });
      if (!booking) {
        failed.push(lrNumber);
        continue;
      }
      appendTrackingEntry(booking, { event, location, remark, timestamp });
      await booking.save();
      success += 1;
    } catch {
      failed.push(lrNumber);
    }
  }

  const skipped = failed.length;

  return NextResponse.json({
    success,
    skipped,
    failed,
    message: skipped
      ? `${success} updated, ${skipped} skipped`
      : `${success} updated`,
  });
}
