import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const raw = Array.isArray(body.lrNumbers) ? body.lrNumbers : [];
  const lrNumbers = [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];

  if (!lrNumbers.length) {
    return NextResponse.json({ valid: [], invalid: [] });
  }

  await dbConnect();

  const found = await Booking.find({ lrNumber: { $in: lrNumbers } }).select("lrNumber").lean();
  const validSet = new Set(found.map((row) => row.lrNumber));
  const valid = lrNumbers.filter((lr) => validSet.has(lr));
  const invalid = lrNumbers.filter((lr) => !validSet.has(lr));

  return NextResponse.json({ valid, invalid });
}
