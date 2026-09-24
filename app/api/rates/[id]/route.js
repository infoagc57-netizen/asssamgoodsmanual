import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Rate from "@/models/Rate";
import { serializeRate, updateRateById } from "@/lib/rateService";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  await dbConnect();
  const doc = await Rate.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }
  return NextResponse.json({ rate: serializeRate(doc) });
}

export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  const body = await req.json();
  const rateValue = Number(body.rate);
  const minFreight = body.minFreight === "" || body.minFreight === undefined ? 0 : Number(body.minFreight);

  if (!body.generalRate && !body.customerId) {
    return NextResponse.json({ error: "Select a customer or mark this as a General Rate." }, { status: 400 });
  }
  if (!body.fromBranch || !body.toBranch || !body.rateType) {
    return NextResponse.json({ error: "From Branch, To Branch and Rate Type are required." }, { status: 400 });
  }
  if (body.fromBranch === body.toBranch) {
    return NextResponse.json({ error: "From Branch and To Branch cannot be the same." }, { status: 400 });
  }
  if (!Number.isFinite(rateValue) || rateValue <= 0) {
    return NextResponse.json({ error: "Rate must be greater than 0." }, { status: 400 });
  }
  if (!Number.isFinite(minFreight) || minFreight < 0) {
    return NextResponse.json({ error: "Minimum Freight cannot be negative." }, { status: 400 });
  }

  await dbConnect();
  const existing = await Rate.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }

  try {
    const rate = await updateRateById(id, {
      customerId: body.generalRate ? "" : body.customerId,
      customerName: body.customerName || "General Rate",
      generalRate: Boolean(body.generalRate),
      fromBranch: body.fromBranch,
      fromBranchName: body.fromBranchName || body.fromBranch,
      toBranch: body.toBranch,
      toBranchName: body.toBranchName || body.toBranch,
      toStation: body.toStation || body.toBranch,
      rate: rateValue,
      rateType: body.rateType,
      minFreight,
      godownAddress: body.godownAddress || "",
      godownMobile: body.godownMobile || "",
      effectiveFrom: body.effectiveFrom,
      status: body.status || "Active",
    });
    return NextResponse.json({ rate });
  } catch (error) {
    if (error.message === "DUPLICATE_ACTIVE") {
      return NextResponse.json(
        { error: "An active rate already exists for this customer, route and rate type." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  const body = await req.json();
  await dbConnect();
  const doc = await Rate.findByIdAndUpdate(
    id,
    { $set: { status: body.status || "Inactive" } },
    { new: true },
  );
  if (!doc) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }
  return NextResponse.json({ rate: serializeRate(doc) });
}

export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  await dbConnect();
  const doc = await Rate.findByIdAndDelete(id);
  if (!doc) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
