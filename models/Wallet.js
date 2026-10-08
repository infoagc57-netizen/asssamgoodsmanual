import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["franchise", "customer"],
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    frozenReason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    lastTransactionAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  schemaOptions,
);

WalletSchema.index({ userId: 1 }, { unique: true });
WalletSchema.index({ role: 1 });

const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

export default Wallet;
