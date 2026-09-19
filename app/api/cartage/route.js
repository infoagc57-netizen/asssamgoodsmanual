import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Cartage from "@/models/Cartage";
import Booking from "@/models/Booking";
import { monthKeyFromDate, serializeCartage } from "@/lib/cartageService";

export const dynamic = "force-dynamic";

function parseMonth(value) {
  const month = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return month;
}

async function bookingsByLr(lrNumbers) {
  const unique = [...new Set(lrNumbers.map((lr) => String(lr || "").trim()).filter(Boolean))];
  if (!unique.length) return new Map();
  const bookings = await Booking.find({ lrNumber: { $in: unique } })
    .select("lrNumber consignee route")
    .lean();
  return new Map(bookings.map((b) => [b.lrNumber, b]));
}

// GET /api/cartage?month=2026-09
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = parseMonth(req.nextUrl.searchParams.get("month"));
  if (!month) {
    return NextResponse.json({ error: "Query param month is required (YYYY-MM)" }, { status: 400 });
  }

  await dbConnect();
  const rows = await Cartage.find({ month }).sort({ date: -1, createdAt: -1 }).lean();
  const bookingMap = await bookingsByLr(rows.map((r) => r.lrNumber));
  const entries = rows.map((row) => serializeCartage(row, bookingMap.get(row.lrNumber)));
  const monthlyTotal = entries.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return NextResponse.json({ month, entries, monthlyTotal });
}

// POST /api/cartage
export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const lrNumber = String(body.lrNumber || "").trim();
  const amount = Number(body.amount);
  if (!lrNumber) {
    return NextResponse.json({ error: "LR number is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }

  const parsedDate = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  await dbConnect();

  const booking = await Booking.findOne({ lrNumber }).select("_id").lean();
  const month = monthKeyFromDate(parsedDate);

  const doc = await Cartage.create({
    date: parsedDate,
    month,
    lrNumber,
    bookingId: booking?._id || null,
    amount,
    vendorName: String(body.vendorName || "").trim(),
    vendorMobile: String(body.vendorMobile || "").trim(),
    vehicleNumber: String(body.vehicleNumber || "").trim(),
    notes: String(body.notes || "").trim(),
    createdBy: session.user.id,
  });

  const fullBooking = booking
    ? await Booking.findById(booking._id).select("consignee route").lean()
    : null;

  return NextResponse.json({
    entry: serializeCartage(doc.toObject(), fullBooking),
  });
}
