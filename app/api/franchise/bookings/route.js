import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import { getNextLrNumber } from "@/lib/lrCounter";
import { serializeBooking } from "@/lib/serializeBooking";
import { upsertParty } from "@/lib/partyService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireFranchise(session) {
  return Boolean(session?.user && session.user.role === "franchise" && session.user.id);
}

export async function GET(req) {
  const session = await auth();
  if (!requireFranchise(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  let limit = Number(searchParams.get("limit") || 100);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(Math.floor(limit), 200);

  const query = { franchiseId: session.user.id };
  if (status) query.status = status;

  const rows = await Booking.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  return NextResponse.json({ bookings: rows.map(serializeBooking) });
}

export async function POST(req) {
  const session = await auth();
  if (!requireFranchise(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const consignor = body?.consignor || {};
  const consignee = body?.consignee || {};
  const route = body?.route || {};
  const goods = body?.goods || {};
  const charges = body?.charges || {};

  const consignorName = String(consignor.name || "").trim();
  const consigneeName = String(consignee.name || "").trim();
  const bookingBranch = String(route.bookingBranch || route.from || "").trim();
  const deliveryBranch = String(route.deliveryBranch || route.to || "").trim();
  const actualWeight = Number(goods.actualWeight ?? goods.weight);

  if (!consignorName || !consigneeName || !bookingBranch || !deliveryBranch || !Number.isFinite(actualWeight) || actualWeight <= 0) {
    return NextResponse.json(
      {
        error:
          "consignor.name, consignee.name, route.bookingBranch, route.deliveryBranch, and goods.actualWeight are required.",
      },
      { status: 400 },
    );
  }

  await dbConnect();

  const paymentType = String(body?.paymentType || "to_pay").toLowerCase().trim();
  const isPrepaid = paymentType === "paid";
  const requiredAmount = Number(body?.baseFreight) || Number(charges?.freight) || 0;

  const userId = session.user.id;
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

  const creditLimit = Number(wallet.creditLimit) || 0;
  let usedFromCredit = 0;
  let walletDeducted = 0;
  let paymentSource = "cash";
  let walletId = null;
  let balanceBeforeForTxn = 0;
  let balanceAfterForTxn = 0;

  if (isPrepaid) {
    if (wallet.isActive === false) {
      return NextResponse.json(
        { error: `Your wallet is frozen. Reason: ${wallet.frozenReason || "Contact admin"}` },
        { status: 403 },
      );
    }

    const balance = Number(wallet.balance) || 0;
    const creditUsed = Number(wallet.creditUsed) || 0;
    const creditAvailable = creditLimit - creditUsed;
    const totalAvailable = balance + creditAvailable;

    if (totalAvailable < requiredAmount) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Available: ₹${totalAvailable.toFixed(2)}, Required: ₹${requiredAmount.toFixed(2)}. Please add money to your wallet, or switch to To Pay.`,
          available: totalAvailable,
          required: requiredAmount,
        },
        { status: 400 },
      );
    }

    const usedFromBalance = Math.min(balance, requiredAmount);
    usedFromCredit = requiredAmount - usedFromBalance;
    balanceBeforeForTxn = balance;

    wallet.balance = balance - usedFromBalance;
    wallet.creditUsed = creditUsed + usedFromCredit;
    wallet.lastTransactionAt = new Date();
    await wallet.save();

    balanceAfterForTxn = wallet.balance;
    walletDeducted = requiredAmount;
    paymentSource = usedFromCredit > 0 ? "credit" : "wallet";
    walletId = wallet._id;
  }

  const requestedLr = String(body?.lrNumber || "").trim();
  const lrMode = String(body?.lrMode || "automatic").toLowerCase().trim();
  const useManual = lrMode === "manual" && requestedLr;

  let nextLr;
  if (useManual) {
    // Franchise can use custom formats: 3-20 chars, alphanumeric + dash/underscore
    if (!/^[A-Z0-9\-_]{3,20}$/i.test(requestedLr)) {
      return NextResponse.json(
        { error: "Invalid LR number. Use 3-20 characters (letters, numbers, dash, underscore only)." },
        { status: 400 },
      );
    }
    // Duplicate check (global — no two bookings can share an LR)
    const existing = await Booking.findOne({ lrNumber: requestedLr }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "This LR number is already used. Please try another." },
        { status: 400 },
      );
    }
    nextLr = requestedLr;
  } else {
    nextLr = await getNextLrNumber();
  }

  const {
    _id,
    lrNumber: _ignoredLr,
    lrMode: _ignoredLrMode,
    createdBy: _ignoredCreatedBy,
    franchiseId: _ignoredFranchiseId,
    trackingHistory: _ignoredTracking,
    walletDeducted: _ignoredWalletDeducted,
    paymentSource: _ignoredPaymentSource,
    walletId: _ignoredWalletId,
    walletTransactionId: _ignoredWalletTxnId,
    ...rest
  } = body;

  const booking = await Booking.create({
    ...rest,
    lrNumber: nextLr,
    lrCode: body.lrCode || "AGC",
    status: body.status || "Booked",
    paymentType: paymentType === "paid" ? "paid" : "to_pay",
    markup: Number(body.markup) || 0,
    baseFreight: Number(body.baseFreight) || 0,
    grandTotal: Number(body.grandTotal) || 0,
    franchiseId: userId,
    createdBy: userId,
    walletDeducted,
    paymentSource,
    walletId,
    route: {
      ...route,
      bookingBranch,
      deliveryBranch,
      toStation: route.toStation || deliveryBranch,
      from: bookingBranch,
      to: deliveryBranch,
    },
    trackingHistory: [
      {
        status: "Booked",
        timestamp: new Date(),
        branch: bookingBranch || "Origin",
        note: "Booking created by franchise",
      },
    ],
  });

  if (isPrepaid && walletDeducted > 0) {
    const txn = await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: "debit",
      amount: requiredAmount,
      balanceBefore: balanceBeforeForTxn,
      balanceAfter: balanceAfterForTxn,
      reason: "booking",
      reference: booking._id,
      referenceType: "Booking",
      description: `Booking ${booking.lrNumber} (Base Freight: ₹${requiredAmount.toFixed(2)})`,
      createdBy: userId,
    });

    if (txn?._id) {
      booking.walletTransactionId = txn._id;
      await booking.save();
    }
  }

  if (consignorName) {
    await upsertParty(consignor, "consignor", userId);
  }
  if (consigneeName) {
    await upsertParty(consignee, "consignee", userId);
  }

  const creditUsedNow = Number(wallet.creditUsed) || 0;

  return NextResponse.json(
    {
      booking: serializeBooking(booking.toObject()),
      wallet: {
        balance: wallet.balance,
        creditUsed: wallet.creditUsed,
        availableWithCredit: wallet.balance + (creditLimit - creditUsedNow),
      },
    },
    { status: 201 },
  );
}
