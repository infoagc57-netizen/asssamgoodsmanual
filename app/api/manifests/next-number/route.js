import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Manifest from "@/models/Manifest";
import { getNextManifestNumber } from "@/lib/manifestService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const manifestNumber = await getNextManifestNumber(Manifest);
  return NextResponse.json({ manifestNumber });
}
