import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import LoadingSheet from "@/models/LoadingSheet";
import Booking from "@/models/Booking";
import {
  getNextLoadingSheetNumber,
  serializeLoadingSheet,
  summarizeLoadingBookings,
} from "@/lib/loadingSheetService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const sheets = await LoadingSheet.find({}).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    sheets: sheets.map(serializeLoadingSheet),
  });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const lrNumbers = [...new Set(
    (Array.isArray(body.lrNumbers) ? body.lrNumbers : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];

  if (!lrNumbers.length) {
    return NextResponse.json({ error: "Select at least one booking" }, { status: 400 });
  }
  if (!String(body.toBranch || "").trim()) {
    return NextResponse.json({ error: "To branch is required" }, { status: 400 });
  }

  await dbConnect();

  const bookings = await Booking.find({ lrNumber: { $in: lrNumbers } }).lean();
  if (bookings.length !== lrNumbers.length) {
    return NextResponse.json({ error: "One or more bookings were not found" }, { status: 400 });
  }

  const blocked = bookings.filter((b) => b.loadingSheetId || b.status !== "Booked");
  if (blocked.length) {
    return NextResponse.json(
      { error: `Cannot load: ${blocked.map((b) => b.lrNumber).join(", ")} (not Booked or already on a sheet)` },
      { status: 400 },
    );
  }

  let manifestNumber = String(body.manifestNumber || "").trim();
  if (!manifestNumber) {
    manifestNumber = await getNextLoadingSheetNumber(LoadingSheet);
  }

  const exists = await LoadingSheet.findOne({ manifestNumber }).select("_id").lean();
  if (exists) {
    return NextResponse.json({ error: "Manifest number already exists" }, { status: 409 });
  }

  const parsedDate = body.date ? new Date(body.date) : new Date();
  const totals = summarizeLoadingBookings(bookings);

  const sheet = await LoadingSheet.create({
    manifestNumber,
    date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    departureTime: String(body.departureTime || "").trim(),
    fromBranch: String(body.fromBranch || "").trim(),
    toBranch: String(body.toBranch || "").trim(),
    truckNumber: String(body.truckNumber || "").trim(),
    driverName: String(body.driverName || "").trim(),
    driverMobile: String(body.driverMobile || "").trim(),
    bookingIds: bookings.map((b) => b._id),
    lrNumbers,
    ...totals,
    status: "Draft",
    createdBy: session.user.id,
  });

  await Booking.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    {
      $set: {
        loadingSheetId: sheet._id,
        loadingSheetNumber: sheet.manifestNumber,
        status: "Loaded",
      },
    },
  );

  return NextResponse.json({ sheet: serializeLoadingSheet(sheet.toObject()) }, { status: 201 });
}
