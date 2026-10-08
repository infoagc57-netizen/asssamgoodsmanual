import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getNextLrNumber } from "@/lib/lrCounter";
import { serializeBooking } from "@/lib/serializeBooking";
import { upsertParty } from "@/lib/partyService";

export const runtime = "nodejs";
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
    .select("lrNumber date time status paymentType deliveryType grandTotal consignor consignee route goods charges createdAt")
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

  const requestedLr = String(body?.lrNumber || "").trim();
  const lrMode = String(body?.lrMode || "automatic").toLowerCase().trim();
  const useManual = lrMode === "manual" && requestedLr;

  let lrNumber;
  if (useManual) {
    // Validate format: 10 digits starting with "79"
    if (!/^79\d{8}$/.test(requestedLr)) {
      return NextResponse.json(
        { error: "Invalid LR number. Must be 10 digits starting with 79." },
        { status: 400 },
      );
    }
    // Duplicate check
    const existing = await Booking.findOne({ lrNumber: requestedLr }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "This LR number is already used. Please try another." },
        { status: 400 },
      );
    }
    lrNumber = requestedLr;
  } else {
    lrNumber = await getNextLrNumber();
  }

  const {
    _id,
    lrNumber: _ignoredLr,
    lrMode: _ignoredLrMode,
    createdBy: _ignoredCreatedBy,
    trackingHistory: _ignoredTracking,
    ...rest
  } = body;

  const booking = await Booking.create({
    ...rest,
    lrNumber,
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
