import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { generateRechargePayload } from "@/lib/walletUpi";
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

export async function POST(req) {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { error: "Amount must be at least ₹100." },
      { status: 400 },
    );
  }
  if (amount > 100000) {
    return NextResponse.json(
      { error: "Amount cannot exceed ₹1,00,000 per transaction." },
      { status: 400 },
    );
  }

  await dbConnect();

  const payload = await generateRechargePayload({
    amount,
    userId: session.user.id,
  });

  const created = await WalletRecharge.create({
    userId: session.user.id,
    role: "franchise",
    amount,
    uniqueCode: payload.uniqueCode,
    upiUri: payload.upiUri,
    qrDataUrl: payload.qrDataUrl,
    status: "pending",
    expiresAt: payload.expiresAt,
  });

  return NextResponse.json(
    { success: true, recharge: serializeRecharge(created) },
    { status: 201 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const userId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : session.user.id;
  const now = new Date();

  await WalletRecharge.updateMany(
    {
      userId,
      status: "pending",
      expiresAt: { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  const pending = await WalletRecharge.findOne({
    userId,
    status: "pending",
    expiresAt: { $gte: now },
  })
    .sort({ created_at: -1 })
    .lean();

  return NextResponse.json({ recharge: serializeRecharge(pending) });
}
