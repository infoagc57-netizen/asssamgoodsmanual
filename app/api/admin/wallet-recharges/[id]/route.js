import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import WalletRecharge from "@/models/WalletRecharge";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
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

  const action = String(body?.action || "").trim().toLowerCase();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject".' },
      { status: 400 },
    );
  }

  const adminNotes = body?.adminNotes !== undefined
    ? String(body.adminNotes || "").trim()
    : undefined;
  const rejectionReason = String(body?.rejectionReason || "").trim() || "No reason provided";

  await dbConnect();

  const recharge = await WalletRecharge.findById(rechargeId);
  if (!recharge) {
    return NextResponse.json({ error: "Recharge not found" }, { status: 404 });
  }

  if (recharge.status !== "pending") {
    return NextResponse.json(
      { error: `This recharge has already been processed (status: ${recharge.status}).` },
      { status: 400 },
    );
  }

  const now = new Date();
  const adminId = toObjectId(session.user.id);

  if (action === "reject") {
    recharge.status = "rejected";
    recharge.rejectedBy = adminId;
    recharge.rejectedAt = now;
    recharge.rejectionReason = rejectionReason;
    if (adminNotes !== undefined) recharge.adminNotes = adminNotes;
    await recharge.save();

    return NextResponse.json({
      success: true,
      recharge: {
        id: String(recharge._id),
        status: recharge.status,
        amount: Number(recharge.amount) || 0,
        userId: String(recharge.userId || ""),
        utr: recharge.utr || "",
        approvedAt: recharge.approvedAt || null,
        rejectedAt: recharge.rejectedAt || null,
        rejectionReason: recharge.rejectionReason || "",
      },
    });
  }

  // APPROVE FLOW
  const userId = toObjectId(recharge.userId);
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      role: recharge.role || "franchise",
      balance: 0,
      creditLimit: 0,
      creditUsed: 0,
      isActive: true,
      createdBy: adminId,
    });
  }

  const balanceBefore = Number(wallet.balance) || 0;
  const creditAmount = Number(recharge.amount) || 0;
  wallet.balance = balanceBefore + creditAmount;
  wallet.lastTransactionAt = now;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    userId,
    type: "credit",
    amount: creditAmount,
    balanceBefore,
    balanceAfter: wallet.balance,
    reason: "recharge",
    reference: recharge._id,
    referenceType: "WalletRecharge",
    description: `Wallet recharge via UPI (UTR: ${recharge.utr || "N/A"})`,
    createdBy: adminId,
  });

  recharge.status = "approved";
  recharge.approvedBy = adminId;
  recharge.approvedAt = now;
  if (adminNotes !== undefined) recharge.adminNotes = adminNotes;
  await recharge.save();

  return NextResponse.json({
    success: true,
    recharge: {
      id: String(recharge._id),
      status: recharge.status,
      amount: Number(recharge.amount) || 0,
      userId: String(recharge.userId || ""),
      utr: recharge.utr || "",
      approvedAt: recharge.approvedAt || null,
      rejectedAt: recharge.rejectedAt || null,
      rejectionReason: recharge.rejectionReason || "",
    },
    wallet: {
      id: String(wallet._id),
      balance: Number(wallet.balance) || 0,
      creditLimit: Number(wallet.creditLimit) || 0,
      creditUsed: Number(wallet.creditUsed) || 0,
    },
  });
}
