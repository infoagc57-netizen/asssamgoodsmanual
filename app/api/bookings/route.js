import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getNextLrNumber, serializeBooking } from "@/lib/serializeBooking";
import { upsertParty } from "@/lib/partyService";

export const dynamic = "force-dynamic";

// GET /api/bookings - list bookings
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const status = searchParams.get("status");
  const notInManifest = searchParams.get("notInManifest") === "1" || searchParams.get("notInManifest") === "true";
  const notOnLoadingSheet = searchParams.get("notOnLoadingSheet") === "1" || searchParams.get("notOnLoadingSheet") === "true";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const query = {};
  if (branchId) query.bookingBranchId = branchId;
  if (status) query.status = status;
  if (notInManifest) {
    query.$or = [{ manifestId: null }, { manifestId: { $exists: false } }];
  }
  if (notOnLoadingSheet) {
    query.$and = [
      ...(query.$and || []),
      { $or: [{ loadingSheetId: null }, { loadingSheetId: { $exists: false } }] },
    ];
  }

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    bookings: bookings.map(serializeBooking),
  });
}

// POST /api/bookings - create booking
export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  await dbConnect();

  const nextLr = await getNextLrNumber(Booking);

  const {
    _id,
    lrNumber: _ignoredLr,
    createdBy: _ignoredCreatedBy,
    trackingHistory: _ignoredTracking,
    ...rest
  } = body;

  const booking = await Booking.create({
    ...rest,
    lrNumber: nextLr,
    createdBy: session.user.id,
    status: body.status || "Booked",
    trackingHistory: [
      {
        status: "Booked",
        timestamp: new Date(),
        branch: body.route?.bookingBranch || body.bookingBranch || "Origin",
        note: "Booking created",
      },
    ],
  });

  if (body.consignor?.name) {
    await upsertParty(body.consignor, "consignor", session.user.id);
  }
  if (body.consignee?.name) {
    await upsertParty(body.consignee, "consignee", session.user.id);
  }

  return NextResponse.json(
    { booking: serializeBooking(booking.toObject()) },
    { status: 201 },
  );
}
