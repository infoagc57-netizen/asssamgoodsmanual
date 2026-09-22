import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { migrateLegacyRates } from "@/lib/rateService";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const legacy = Array.isArray(body.rates) ? body.rates : [];
  if (!legacy.length) {
    return NextResponse.json({ migrated: 0, rates: [] });
  }

  await dbConnect();
  const result = await migrateLegacyRates(legacy, session.user.id);
  return NextResponse.json(result);
}
