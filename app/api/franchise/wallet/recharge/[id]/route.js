import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import WalletRecharge from "@/models/WalletRecharge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeRecharge(doc) {
  if (!doc) return null;
  const row = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(row._id || row.id),
    amount: Number(row.amount) || 0,
    uniqueCode: row.uniqueCode || "",
    upiUri: row.upiUri || "",
    qrDataUrl: row.qrDataUrl || "",
    expiresAt: row.expiresAt || null,
    status: row.status || "pending",
    utr: row.utr || "",
  };
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rechargeId = String(id || "").trim();
  if (!rechargeId || !mongoose.Types.ObjectId.isValid(rechargeId)) {
    return NextResponse.json({ error: "Invalid recharge id" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const utr = String(body?.utr || "").trim();
  if (!utr) {
    return NextResponse.json({ error: "UTR / Transaction ID is required." }, { status: 400 });
  }

  await dbConnect();

  const userId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;

  const recharge = await WalletRecharge.findOne({
    _id: rechargeId,
    userId,
  });

  if (!recharge) {
    return NextResponse.json({ error: "Recharge not found" }, { status: 404 });
  }

  if (recharge.status === "expired") {
    return NextResponse.json({ error: "This QR has expired. Generate a new one." }, { status: 400 });
  }

  if (recharge.status === "approved") {
    return NextResponse.json({ error: "This recharge is already approved." }, { status: 400 });
  }

  if (recharge.status === "rejected") {
    return NextResponse.json({ error: "This recharge was rejected. Generate a new one." }, { status: 400 });
  }

  recharge.utr = utr;
  await recharge.save();

  return NextResponse.json({ success: true, recharge: serializeRecharge(recharge) });
}
