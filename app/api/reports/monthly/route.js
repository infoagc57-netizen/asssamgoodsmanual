import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { serializeBooking } from "@/lib/serializeBooking";

export const dynamic = "force-dynamic";

function amountFor(booking) {
  return Number(booking.grandTotal) || 0;
}

function weightFor(booking) {
  return Number(booking.goods?.chargedWeight || booking.goods?.actualWeight) || 0;
}

function paymentKind(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "paid") return "paid";
  if (normalized === "tbb") return "tbb";
  return "to_pay";
}

function mapRow(booking, index) {
  const serialized = serializeBooking(booking);
  return {
    sr: index + 1,
    lrNumber: serialized.lrNumber,
    date: serialized.date || serialized.createdAt,
    consignor: serialized.consignor?.name || "",
    consignee: serialized.consignee?.name || "",
    city: serialized.consignee?.city || "",
    fromBranch: serialized.route?.bookingBranch || "",
    toBranch: serialized.route?.deliveryBranch || serialized.route?.deliveryAt || "",
    packages: Number(serialized.goods?.packages) || 0,
    weight: weightFor(serialized),
    amount: amountFor(serialized),
    paymentType: serialized.paymentType || "",
    status: serialized.status || "Booked",
    deliveryType: serialized.deliveryType || "door",
  };
}

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const branch = searchParams.get("branch") || "";
  const status = searchParams.get("status") || "";
  const deliveryType = searchParams.get("deliveryType") || "";

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
  }

  await dbConnect();

  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, mon, 1, 0, 0, 0, 0);

  const monthQuery = { createdAt: { $gte: start, $lt: end } };

  const query = { ...monthQuery };
  if (branch) query["route.bookingBranch"] = branch;
  if (status) query.status = status;
  if (deliveryType) query.deliveryType = deliveryType;

  const [bookings, branches, statuses] = await Promise.all([
    Booking.find(query).sort({ createdAt: 1 }).lean(),
    Booking.distinct("route.bookingBranch", monthQuery),
    Booking.distinct("status", monthQuery),
  ]);

  const rows = bookings.map(mapRow);

  const summary = {
    totalBookings: rows.length,
    totalBoxes: rows.reduce((sum, row) => sum + row.packages, 0),
    totalWeight: rows.reduce((sum, row) => sum + row.weight, 0),
    totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
    toPayAmount: rows
      .filter((row) => paymentKind(row.paymentType) === "to_pay")
      .reduce((sum, row) => sum + row.amount, 0),
    paidAmount: rows
      .filter((row) => paymentKind(row.paymentType) === "paid")
      .reduce((sum, row) => sum + row.amount, 0),
    tbbAmount: rows
      .filter((row) => paymentKind(row.paymentType) === "tbb")
      .reduce((sum, row) => sum + row.amount, 0),
    codAmount: bookings.reduce((sum, booking) => sum + (Number(booking.goods?.codAmount) || 0), 0),
  };

  return NextResponse.json({
    month,
    rows,
    summary,
    filterOptions: {
      branches: branches.filter(Boolean).sort(),
      statuses: statuses.filter(Boolean).sort(),
      deliveryTypes: ["door", "godown"],
    },
    generatedAt: new Date().toISOString(),
  });
}
