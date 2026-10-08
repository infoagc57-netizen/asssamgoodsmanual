import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Rate from "@/models/Rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeRate(doc) {
  return {
    id: String(doc._id),
    fromStation: doc.fromBranchName || doc.fromBranch || "All",
    toStation: doc.toStation || doc.toBranchName || doc.toBranch || "",
    rateType: doc.rateType || "Per Kg",
    rate: Number(doc.rate) || 0,
    minWeight: Number(doc.minWeight) || 0,
    maxWeight: Number(doc.maxWeight) || 0,
    minCharge: Number(doc.minFreight ?? doc.minCharge) || 0,
    transitDays: Number(doc.transitDays) || 0,
    isActive: (doc.status || "Active") === "Active",
    status: doc.status || "Active",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const rows = await Rate.find({ status: "Active" })
    .sort({ toStation: 1, fromBranchName: 1 })
    .lean();

  return NextResponse.json({ rates: rows.map(serializeRate) });
}
