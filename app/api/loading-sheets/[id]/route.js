import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import LoadingSheet from "@/models/LoadingSheet";
import Booking from "@/models/Booking";
import { serializeLoadingSheet } from "@/lib/loadingSheetService";
import { serializeBooking } from "@/lib/serializeBooking";

export const dynamic = "force-dynamic";

function sheetQuery(id) {
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
  const sheet = await LoadingSheet.findOne(sheetQuery(params.id)).lean();
  if (!sheet) {
    return NextResponse.json({ error: "Loading sheet not found" }, { status: 404 });
  }

  const bookings = await Booking.find({ lrNumber: { $in: sheet.lrNumbers || [] } }).lean();
  const bookingMap = new Map(bookings.map((b) => [b.lrNumber, b]));
  const orderedBookings = (sheet.lrNumbers || [])
    .map((lr) => bookingMap.get(lr))
    .filter(Boolean)
    .map(serializeBooking);

  const summary = {
    totalLr: sheet.totalBookings ?? orderedBookings.length,
    totalPackages: sheet.totalPackages ?? 0,
    totalWeight: sheet.totalWeight ?? 0,
    totalFreight: sheet.totalAmount ?? orderedBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
  };

  return NextResponse.json({
    sheet: serializeLoadingSheet(sheet),
    bookings: orderedBookings,
    summary,
  });
}
