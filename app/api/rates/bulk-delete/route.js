import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Rate from "@/models/Rate";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No rate IDs provided" }, { status: 400 });
  }

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid rate IDs provided" }, { status: 400 });
  }

  await dbConnect();

  const result = await Rate.deleteMany({ _id: { $in: validIds } });

  return NextResponse.json({
    success: true,
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} rate(s) deleted`,
  });
}
