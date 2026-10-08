import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Party from "@/models/Party";
import Booking from "@/models/Booking";
import { serializeParty } from "@/lib/partyService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const userId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;

  const [parties, bookings] = await Promise.all([
    Party.find({ createdBy: userId }).sort({ updatedAt: -1 }).lean(),
    Booking.find({ franchiseId: userId }).select("consignor.name").lean(),
  ]);

  const bookingCount = {};
  for (const booking of bookings) {
    const name = String(booking.consignor?.name || "").trim().toLowerCase();
    if (!name) continue;
    bookingCount[name] = (bookingCount[name] || 0) + 1;
  }

  const customers = parties.map((party) => {
    const row = serializeParty(party);
    return {
      id: row.id,
      name: row.name || "",
      mobile: row.mobile || "",
      gst: row.gst || "",
      city: row.city || "",
      state: row.state || "",
      address: row.address || "",
      partyType: row.partyType || "",
      totalBookings: bookingCount[String(row.name || "").toLowerCase()] || 0,
    };
  });

  return NextResponse.json({ customers });
}
