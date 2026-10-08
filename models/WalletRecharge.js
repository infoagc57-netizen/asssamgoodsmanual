import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";

const WalletRechargeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["franchise", "customer"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    upiUri: {
      type: String,
      required: true,
    },
    qrDataUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    utr: {
      type: String,
      default: "",
    },
    screenshotUrl: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  schemaOptions,
);

WalletRechargeSchema.index({ userId: 1, status: 1 });
WalletRechargeSchema.index({ status: 1, created_at: -1 });

const WalletRecharge =
  mongoose.models.WalletRecharge ||
  mongoose.model("WalletRecharge", WalletRechargeSchema);

export default WalletRecharge;
