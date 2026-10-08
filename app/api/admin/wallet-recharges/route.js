import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import WalletRecharge from "@/models/WalletRecharge";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const statusParam = String(searchParams.get("status") || "all").trim().toLowerCase();
  let limit = Number(searchParams.get("limit") || 100);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(Math.floor(limit), 500);

  const now = new Date();

  await WalletRecharge.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  const query = {};
  if (["pending", "approved", "rejected", "expired"].includes(statusParam)) {
    query.status = statusParam;
  }

  const rows = await WalletRecharge.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set(rows.map((row) => String(row.userId)).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
      .select("name email phone companyName")
      .lean()
    : [];

  const userMap = new Map(users.map((user) => [String(user._id), user]));

  const recharges = rows.map((row) => {
    const user = userMap.get(String(row.userId)) || {};
    return {
      id: String(row._id),
      userId: String(row.userId || ""),
      userName: user.name || "",
      userEmail: user.email || "",
      userPhone: user.phone || "",
      userCompany: user.companyName || "",
      role: row.role || "",
      amount: Number(row.amount) || 0,
      uniqueCode: row.uniqueCode || "",
      utr: row.utr || "",
      status: row.status || "pending",
      qrDataUrl: row.qrDataUrl || "",
      createdAt: row.created_at || null,
      expiresAt: row.expiresAt || null,
      approvedAt: row.approvedAt || null,
      rejectedAt: row.rejectedAt || null,
      rejectionReason: row.rejectionReason || "",
      adminNotes: row.adminNotes || "",
    };
  });

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [pendingAgg, approvedTodayAgg, rejectedCount, processedTodayCount] = await Promise.all([
    WalletRecharge.aggregate([
      { $match: { status: "pending" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ["$amount", 0] } },
        },
      },
    ]),
    WalletRecharge.aggregate([
      {
        $match: {
          status: "approved",
          approvedAt: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ["$amount", 0] } },
        },
      },
    ]),
    WalletRecharge.countDocuments({ status: "rejected" }),
    WalletRecharge.countDocuments({
      status: { $in: ["approved", "rejected"] },
      $or: [
        { approvedAt: { $gte: startOfDay } },
        { rejectedAt: { $gte: startOfDay } },
      ],
    }),
  ]);

  return NextResponse.json({
    recharges,
    summary: {
      pendingCount: pendingAgg[0]?.count || 0,
      pendingAmount: pendingAgg[0]?.amount || 0,
      approvedTodayCount: approvedTodayAgg[0]?.count || 0,
      approvedTodayAmount: approvedTodayAgg[0]?.amount || 0,
      rejectedCount,
      totalProcessedToday: processedTodayCount,
    },
  });
}
