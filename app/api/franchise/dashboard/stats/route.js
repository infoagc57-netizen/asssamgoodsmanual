import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Party from "@/models/Party";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bookingRevenueExpr() {
  return { $ifNull: ["$grandTotal", 0] };
}

function mapRecentToActivity(bookings) {
  const items = [];
  for (const booking of bookings) {
    const lr = booking.lrNumber || "—";
    const created = booking.createdAt || booking.date;
    items.push({
      id: `lr-${lr}`,
      href: booking.lrNumber ? `/franchise/bookings/${encodeURIComponent(booking.lrNumber)}` : "/franchise/bookings",
      title: `LR ${lr} booked`,
      detail: [
        booking.consignor?.name,
        booking.route?.bookingBranch,
        booking.status || "Booked",
      ].filter(Boolean).join(" · "),
      stamp: created,
      sort: created ? new Date(created).getTime() : 0,
    });
    for (const entry of booking.trackingHistory || []) {
      items.push({
        id: `evt-${lr}-${entry.id || entry.event}`,
        href: booking.lrNumber ? `/franchise/bookings/${encodeURIComponent(booking.lrNumber)}` : "/franchise/bookings",
        title: entry.event || entry.status || "Tracking update",
        detail: [`LR ${lr}`, entry.location, entry.remark || entry.note].filter(Boolean).join(" · "),
        stamp: entry.createdAt || entry.timestamp,
        sort: entry.createdAt || entry.timestamp
          ? new Date(entry.createdAt || entry.timestamp).getTime()
          : 0,
      });
    }
  }
  return items.sort((a, b) => b.sort - a.sort).slice(0, 10);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const franchiseId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;
  const franchiseFilter = { franchiseId };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayBookings,
    todayRevenueAgg,
    activeTrips,
    inTransit,
    delivered,
    booked,
    loaded,
    arrived,
    totalBookings,
    pendingPod,
    totalBoxesAgg,
    codPendingAgg,
    toPayAgg,
    tbbAgg,
    branchGroups,
    recentBookings,
    partyCount,
  ] = await Promise.all([
    Booking.countDocuments({ ...franchiseFilter, createdAt: { $gte: todayStart } }),

    Booking.aggregate([
      { $match: { ...franchiseFilter, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: bookingRevenueExpr() } } },
    ]),

    Booking.countDocuments({
      ...franchiseFilter,
      status: { $in: ["Loaded", "In Transit", "Arrived at Branch", "Arrived", "Manifest Uploaded"] },
    }),

    Booking.countDocuments({ ...franchiseFilter, status: "In Transit" }),

    Booking.countDocuments({ ...franchiseFilter, status: "Delivered" }),

    Booking.countDocuments({ ...franchiseFilter, status: "Booked" }),

    Booking.countDocuments({ ...franchiseFilter, status: "Loaded" }),

    Booking.countDocuments({ ...franchiseFilter, status: { $in: ["Arrived at Branch", "Arrived"] } }),

    Booking.countDocuments({ ...franchiseFilter }),

    Booking.countDocuments({
      ...franchiseFilter,
      status: { $in: ["Delivered", "Arrived at Branch", "Arrived"] },
      trackingHistory: { $not: { $elemMatch: { event: "POD Received" } } },
    }),

    Booking.aggregate([
      { $match: franchiseFilter },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$goods.packages", 0] } } } },
    ]),

    Booking.aggregate([
      { $match: { ...franchiseFilter, status: { $ne: "Delivered" } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$goods.codAmount", 0] } } } },
    ]),

    Booking.aggregate([
      {
        $match: {
          ...franchiseFilter,
          paymentType: { $in: ["to_pay", "TO PAY", "To Pay"] },
          status: { $ne: "Delivered" },
        },
      },
      { $group: { _id: null, total: { $sum: bookingRevenueExpr() } } },
    ]),

    Booking.aggregate([
      {
        $match: {
          ...franchiseFilter,
          paymentType: { $in: ["tbb", "TBB"] },
          status: { $ne: "Delivered" },
        },
      },
      { $group: { _id: null, total: { $sum: bookingRevenueExpr() } } },
    ]),

    Booking.aggregate([
      { $match: franchiseFilter },
      {
        $group: {
          _id: { $ifNull: ["$route.bookingBranch", "Unassigned"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),

    Booking.find(franchiseFilter)
      .sort({ createdAt: -1 })
      .limit(12)
      .select("lrNumber consignor consignee route status createdAt date trackingHistory grandTotal")
      .lean(),

    // Party has no franchiseId field yet — unfiltered for now
    Party.countDocuments({}),
  ]);

  const toPayPending = toPayAgg[0]?.total || 0;
  const tbbPending = tbbAgg[0]?.total || 0;
  const branchSnapshotRaw = branchGroups.map((row) => ({
    id: String(row._id),
    name: String(row._id || "Unassigned"),
    count: row.count,
  }));
  const maxBranch = Math.max(1, ...branchSnapshotRaw.map((item) => item.count));
  const branchSnapshot = branchSnapshotRaw.map((item) => ({
    ...item,
    percent: Math.round((item.count / maxBranch) * 100),
  }));

  const distinctBranches = await Booking.distinct("route.bookingBranch", franchiseFilter);
  const branches = distinctBranches.filter((name) => String(name || "").trim()).length;

  const activity = mapRecentToActivity(recentBookings);

  const data = {
    todayBookings,
    todayRevenue: todayRevenueAgg[0]?.total || 0,
    activeTrips,
    totalTrips: activeTrips,
    inTransit,
    delivered,
    booked,
    loaded,
    arrived,
    totalBookings,
    totalBoxes: totalBoxesAgg[0]?.total || 0,
    codPending: codPendingAgg[0]?.total || 0,
    toPayPending,
    tbbPending,
    outstanding: toPayPending + tbbPending,
    vendorPayable: 0,
    pendingPod,
    customers: partyCount,
    branches,
    vehicles: 0,
    activity,
    branchSnapshot,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
