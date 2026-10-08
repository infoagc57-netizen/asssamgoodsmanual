import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
}

function availableWithCredit(wallet) {
  const balance = Number(wallet?.balance) || 0;
  const creditLimit = Number(wallet?.creditLimit) || 0;
  const creditUsed = Number(wallet?.creditUsed) || 0;
  return balance + (creditLimit - creditUsed);
}

function serializeWallet(wallet, user = {}) {
  const balance = Number(wallet?.balance) || 0;
  const creditLimit = Number(wallet?.creditLimit) || 0;
  const creditUsed = Number(wallet?.creditUsed) || 0;
  return {
    userId: String(user._id || wallet?.userId || ""),
    userName: user.name || "",
    userEmail: user.email || "",
    userPhone: user.phone || "",
    userCompany: user.companyName || "",
    role: user.role || wallet?.role || "",
    walletId: wallet?._id ? String(wallet._id) : null,
    balance,
    creditLimit,
    creditUsed,
    isActive: wallet?.isActive !== false,
    frozenReason: wallet?.frozenReason || "",
    availableWithCredit: availableWithCredit({ balance, creditLimit, creditUsed }),
    lastTransactionAt: wallet?.lastTransactionAt || null,
  };
}

export async function GET(req) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const roleParam = String(searchParams.get("role") || "all").trim().toLowerCase();
  const search = String(searchParams.get("search") || "").trim();
  let limit = Number(searchParams.get("limit") || 100);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(Math.floor(limit), 500);

  const query = {};
  if (roleParam === "franchise" || roleParam === "customer") {
    query.role = roleParam;
  } else {
    query.role = { $in: ["franchise", "customer"] };
  }

  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    query.$or = [
      { name: rx },
      { email: rx },
      { phone: rx },
      { companyName: rx },
    ];
  }

  const users = await User.find(query)
    .select("name email phone companyName role")
    .limit(limit)
    .lean();

  const userIds = users.map((user) => user._id);
  const wallets = userIds.length
    ? await Wallet.find({ userId: { $in: userIds } }).lean()
    : [];

  const walletMap = new Map(
    wallets.map((wallet) => [String(wallet.userId), wallet]),
  );

  const rows = users.map((user) => {
    const wallet = walletMap.get(String(user._id));
    if (wallet) return serializeWallet(wallet, user);
    return serializeWallet(
      {
        userId: user._id,
        role: user.role,
        balance: 0,
        creditLimit: 0,
        creditUsed: 0,
        isActive: true,
        frozenReason: "",
        lastTransactionAt: null,
      },
      user,
    );
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalWallets += 1;
      acc.totalBalance += Number(row.balance) || 0;
      acc.totalCreditLimit += Number(row.creditLimit) || 0;
      acc.totalCreditUsed += Number(row.creditUsed) || 0;
      acc.totalAvailable += Number(row.availableWithCredit) || 0;
      return acc;
    },
    {
      totalWallets: 0,
      totalBalance: 0,
      totalCreditLimit: 0,
      totalCreditUsed: 0,
      totalAvailable: 0,
    },
  );

  return NextResponse.json({ wallets: rows, summary });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userIdRaw = String(body?.userId || "").trim();
  const action = String(body?.action || "").trim().toLowerCase();
  const notes = String(body?.notes || "").trim();
  const amount = Number(body?.amount);

  const allowedActions = [
    "add_balance",
    "deduct_balance",
    "set_credit_limit",
    "freeze",
    "unfreeze",
  ];
  if (!allowedActions.includes(action)) {
    return NextResponse.json(
      {
        error:
          'action must be one of: "add_balance", "deduct_balance", "set_credit_limit", "freeze", "unfreeze".',
      },
      { status: 400 },
    );
  }

  if (!userIdRaw || !mongoose.Types.ObjectId.isValid(userIdRaw)) {
    return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(userIdRaw)
    .select("name email phone companyName role")
    .lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!["franchise", "customer"].includes(user.role)) {
    return NextResponse.json(
      { error: "Wallets are only supported for franchise or customer users." },
      { status: 400 },
    );
  }

  const userId = toObjectId(userIdRaw);
  const adminId = toObjectId(session.user.id);
  const now = new Date();

  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      role: user.role,
      balance: 0,
      creditLimit: 0,
      creditUsed: 0,
      isActive: true,
      createdBy: adminId,
    });
  }

  if (action === "freeze") {
    wallet.isActive = false;
    wallet.frozenReason = notes || "Frozen by admin";
    await wallet.save();
    return NextResponse.json({
      success: true,
      wallet: serializeWallet(wallet.toObject ? wallet.toObject() : wallet, user),
    });
  }

  if (action === "unfreeze") {
    wallet.isActive = true;
    wallet.frozenReason = "";
    await wallet.save();
    return NextResponse.json({
      success: true,
      wallet: serializeWallet(wallet.toObject ? wallet.toObject() : wallet, user),
    });
  }

  if (action === "set_credit_limit") {
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a number greater than or equal to 0." },
        { status: 400 },
      );
    }
    wallet.creditLimit = amount;
    await wallet.save();
    return NextResponse.json({
      success: true,
      wallet: serializeWallet(wallet.toObject ? wallet.toObject() : wallet, user),
    });
  }

  // add_balance / deduct_balance
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a number greater than 0." },
      { status: 400 },
    );
  }

  const balanceBefore = Number(wallet.balance) || 0;

  if (action === "deduct_balance") {
    if (balanceBefore < amount) {
      return NextResponse.json(
        { error: "Insufficient wallet balance for deduction." },
        { status: 400 },
      );
    }
    wallet.balance = balanceBefore - amount;
    wallet.lastTransactionAt = now;
    await wallet.save();

    await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: "debit",
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      reason: "admin_debit",
      reference: null,
      referenceType: "Manual",
      description: notes || "Admin debit",
      createdBy: adminId,
    });
  } else {
    // add_balance
    wallet.balance = balanceBefore + amount;
    wallet.lastTransactionAt = now;
    await wallet.save();

    await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: "credit",
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      reason: "admin_credit",
      reference: null,
      referenceType: "Manual",
      description: notes || "Admin credit",
      createdBy: adminId,
    });
  }

  return NextResponse.json({
    success: true,
    wallet: serializeWallet(wallet.toObject ? wallet.toObject() : wallet, user),
  });
}
