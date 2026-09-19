import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Cartage from "@/models/Cartage";
import Booking from "@/models/Booking";
import { monthKeyFromDate, serializeCartage } from "@/lib/cartageService";

export const dynamic = "force-dynamic";

function entryId(id) {
  const key = decodeURIComponent(id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(key)) return null;
  return key;
}

// PUT /api/cartage/:id
export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = entryId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Invalid cartage id" }, { status: 400 });
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

  const booking = await Booking.findOne({ lrNumber }).select("_id consignee route").lean();

  const updated = await Cartage.findByIdAndUpdate(
    id,
    {
      $set: {
        date: parsedDate,
        month: monthKeyFromDate(parsedDate),
        lrNumber,
        bookingId: booking?._id || null,
        amount,
        vendorName: String(body.vendorName || "").trim(),
        vendorMobile: String(body.vendorMobile || "").trim(),
        vehicleNumber: String(body.vehicleNumber || "").trim(),
        notes: String(body.notes || "").trim(),
      },
    },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Cartage entry not found" }, { status: 404 });
  }

  return NextResponse.json({
    entry: serializeCartage(updated, booking),
  });
}

// DELETE /api/cartage/:id
export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = entryId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Invalid cartage id" }, { status: 400 });
  }

  await dbConnect();
  const deleted = await Cartage.findByIdAndDelete(id).lean();
  if (!deleted) {
    return NextResponse.json({ error: "Cartage entry not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
