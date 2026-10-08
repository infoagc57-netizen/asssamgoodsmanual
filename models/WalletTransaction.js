import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";

const WalletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      enum: [
        "recharge",
        "booking",
        "refund",
        "admin_credit",
        "admin_debit",
        "credit_limit_change",
        "cancellation",
      ],
      required: true,
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceType: {
      type: String,
      enum: ["Booking", "WalletRecharge", "Manual", ""],
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  schemaOptions,
);

// schemaOptions maps timestamps to created_at / updated_at
WalletTransactionSchema.index({ userId: 1, created_at: -1 });
WalletTransactionSchema.index({ walletId: 1, created_at: -1 });
WalletTransactionSchema.index({ reference: 1 });

const WalletTransaction =
  mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;
