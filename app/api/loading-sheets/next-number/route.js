import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import LoadingSheet from "@/models/LoadingSheet";
import { getNextLoadingSheetNumber } from "@/lib/loadingSheetService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const manifestNumber = await getNextLoadingSheetNumber(LoadingSheet);
  return NextResponse.json({ manifestNumber });
}
