import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Party from "@/models/Party";
import { normalizePartyInput, serializeParty } from "@/lib/partyService";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid party id." }, { status: 400 });
  }

  const body = await req.json();
  const normalized = normalizePartyInput(body);
  if (!normalized.name) {
    return NextResponse.json({ error: "Party name is required." }, { status: 400 });
  }

  await dbConnect();
  const existing = await Party.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Party not found." }, { status: 404 });
  }

  const updates = { ...normalized, lastUsedAt: new Date() };
  if (["consignor", "consignee", "both"].includes(body.partyType)) {
    updates.partyType = body.partyType;
  }

  const party = await Party.findByIdAndUpdate(id, { $set: updates }, { new: true });
  return NextResponse.json({ party: serializeParty(party) });
}
