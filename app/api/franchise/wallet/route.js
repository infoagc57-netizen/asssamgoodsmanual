import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "franchise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const userId = toObjectId(session.user.id);

  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      role: "franchise",
      balance: 0,
      creditLimit: 0,
      creditUsed: 0,
      isActive: true,
    });
  }

  const rows = await WalletTransaction.find({ userId })
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  const balance = Number(wallet.balance) || 0;
  const creditLimit = Number(wallet.creditLimit) || 0;
  const creditUsed = Number(wallet.creditUsed) || 0;
  const availableWithCredit = balance + (creditLimit - creditUsed);

  return NextResponse.json({
    wallet: {
      id: String(wallet._id),
      balance,
      creditLimit,
      creditUsed,
      isActive: Boolean(wallet.isActive),
      availableWithCredit,
      frozenReason: wallet.frozenReason || "",
      lastTransactionAt: wallet.lastTransactionAt || null,
    },
    transactions: rows.map((row) => ({
      id: String(row._id),
      type: row.type || "",
      amount: Number(row.amount) || 0,
      balanceAfter: Number(row.balanceAfter) || 0,
      reason: row.reason || "",
      description: row.description || "",
      createdAt: row.created_at || row.createdAt || null,
      referenceType: row.referenceType || "",
    })),
  });
}
