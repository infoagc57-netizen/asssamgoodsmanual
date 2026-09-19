import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Manifest from "@/models/Manifest";
import Booking from "@/models/Booking";
import {
  getNextManifestNumber,
  serializeManifest,
  summarizeBookings,
} from "@/lib/manifestService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "today";
  const specificDate = searchParams.get("date");

  await dbConnect();

  const query = {};

  if (specificDate && /^\d{4}-\d{2}-\d{2}$/.test(specificDate)) {
    const start = new Date(`${specificDate}T00:00:00.000+05:30`);
    const end = new Date(`${specificDate}T23:59:59.999+05:30`);
    query.createdAt = { $gte: start, $lte: end };
  } else if (filter === "today") {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoff };
  } else if (filter === "yesterday") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: yesterdayStart, $lt: todayStart };
  } else if (filter === "last7") {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoff };
  }

  const manifests = await Manifest.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    manifests: manifests.map(serializeManifest),
    count: manifests.length,
    filter: specificDate ? "date" : filter,
    date: specificDate || null,
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

  await dbConnect();

  const bookings = await Booking.find({ lrNumber: { $in: lrNumbers } });
  if (bookings.length !== lrNumbers.length) {
    const found = new Set(bookings.map((b) => b.lrNumber));
    const missing = lrNumbers.filter((lr) => !found.has(lr));
    return NextResponse.json(
      { error: `Bookings not found: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const alreadyAssigned = bookings.filter((b) => b.manifestId);
  if (alreadyAssigned.length) {
    return NextResponse.json(
      {
        error: `Already in a manifest: ${alreadyAssigned.map((b) => b.lrNumber).join(", ")}`,
      },
      { status: 400 },
    );
  }

  let manifestNumber = String(body.manifestNumber || "").trim();
  if (!manifestNumber) {
    manifestNumber = await getNextManifestNumber(Manifest);
  }

  const existingNumber = await Manifest.findOne({ manifestNumber }).select("_id").lean();
  if (existingNumber) {
    return NextResponse.json({ error: "Manifest number already exists" }, { status: 409 });
  }

  const parsedDate = body.date ? new Date(body.date) : new Date();
  const totals = summarizeBookings(bookings.map((b) => b.toObject()));

  const manifest = await Manifest.create({
    manifestNumber,
    date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    fromBranch: String(body.fromBranch || "").trim(),
    toBranch: String(body.toBranch || "").trim(),
    truckNumber: String(body.truckNumber || "").trim(),
    driverName: String(body.driverName || "").trim(),
    driverMobile: String(body.driverMobile || "").trim(),
    transporterName: String(body.transporterName || "").trim(),
    notes: String(body.notes || "").trim(),
    bookingIds: bookings.map((b) => b._id),
    lrNumbers,
    ...totals,
    status: body.status || "Draft",
    createdBy: session.user.id,
  });

  await Booking.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    {
      $set: {
        manifestId: manifest._id,
        manifestNumber: manifest.manifestNumber,
        status: "Loaded",
      },
    },
  );

  return NextResponse.json({ manifest: serializeManifest(manifest.toObject()) }, { status: 201 });
}
