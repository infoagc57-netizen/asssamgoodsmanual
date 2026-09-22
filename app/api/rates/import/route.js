import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { importParsedGeneralRates } from "@/lib/rateService";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = Array.isArray(body.rates) ? body.rates : Array.isArray(body.parsed) ? body.parsed : [];
  if (!parsed.length) {
    return NextResponse.json({ error: "No rates to import." }, { status: 400 });
  }

  await dbConnect();
  const result = await importParsedGeneralRates(parsed, session.user.id);
  const preserved = result.total - result.importedCount;
  return NextResponse.json({
    ...result,
    message: `${result.importedCount} rate(s) imported · ${result.total} total (${preserved} existing preserved)`,
  });
}
