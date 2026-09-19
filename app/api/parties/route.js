import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import {
  normalizePartyInput,
  searchParties,
  serializeParty,
  upsertParty,
} from "@/lib/partyService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const partyType = searchParams.get("partyType") || searchParams.get("type") || "";
  const limit = searchParams.get("limit") || "20";

  const parties = await searchParties({ q, partyType, limit });
  return NextResponse.json({ parties });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const normalized = normalizePartyInput(body);
  if (!normalized.name) {
    return NextResponse.json({ error: "Party name is required." }, { status: 400 });
  }

  const partyType = ["consignor", "consignee", "both"].includes(body.partyType)
    ? body.partyType
    : "both";

  await dbConnect();
  const { party, created } = await upsertParty(normalized, partyType, session.user.id);

  return NextResponse.json(
    { party: serializeParty(party), created },
    { status: created ? 201 : 200 },
  );
}
