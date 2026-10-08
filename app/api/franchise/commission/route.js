import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const franchiseId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;

  const rows = await Booking.find({ franchiseId })
    .sort({ createdAt: -1 })
    .select("lrNumber date consignor consignee route baseFreight markup status createdAt paymentType")
    .lean();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalCommission = 0;
  let thisMonthCommission = 0;
  let pendingCommission = 0;

  const bookings = rows.map((row) => {
    const markup = Number(row.markup) || 0;
    const createdAt = row.createdAt ? new Date(row.createdAt) : null;
    const status = String(row.status || "Booked");
    const isPending = !["Delivered", "Cancelled"].includes(status);

    totalCommission += markup;
    if (createdAt && createdAt >= monthStart) thisMonthCommission += markup;
    if (isPending) pendingCommission += markup;

    return {
      id: String(row._id),
      lrNumber: row.lrNumber || "",
      date: row.date || (createdAt ? createdAt.toISOString().slice(0, 10) : ""),
      consignorName: row.consignor?.name || "",
      consigneeName: row.consignee?.name || "",
      route: {
        from: row.route?.bookingBranch || row.route?.from || "",
        to: row.route?.deliveryBranch || row.route?.toStation || row.route?.to || "",
      },
      baseFreight: Number(row.baseFreight) || 0,
      markup,
      status,
    };
  });

  return NextResponse.json({
    bookings,
    summary: {
      totalCommission,
      thisMonthCommission,
      pendingCommission,
    },
  });
}
