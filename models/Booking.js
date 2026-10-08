import mongoose from "mongoose";

const TrackingHistorySchema = new mongoose.Schema(
  {
    status: String,
    timestamp: Date,
    branch: String,
    note: String,
    event: String,
    location: String,
    remark: String,
    id: String,
    createdAt: String,
  },
  { _id: false },
);

const BookingSchema = new mongoose.Schema(
  {
    lrNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lrCode: String,
    status: {
      type: String,
      default: "Booked",
      index: true,
    },
    date: String,
    time: String,
    paymentType: String,
    deliveryType: {
      type: String,
      default: "door",
    },
    godownAddress: { type: String, default: "" },
    godownMobile: { type: String, default: "" },
    grandTotal: {
      type: Number,
      default: 0,
    },
    markup: {
      type: Number,
      default: 0,
    },
    baseFreight: {
      type: Number,
      default: 0,
    },
    walletDeducted: {
      type: Number,
      default: 0,
    },
    paymentSource: {
      type: String,
      enum: ["cash", "wallet", "credit", ""],
      default: "cash",
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    consignor: mongoose.Schema.Types.Mixed,
    consignee: mongoose.Schema.Types.Mixed,
    route: mongoose.Schema.Types.Mixed,
    unitRate: Number,
    rateSource: String,
    rateType: String,
    goods: mongoose.Schema.Types.Mixed,
    dimensions: mongoose.Schema.Types.Mixed,
    charges: mongoose.Schema.Types.Mixed,
    bookingBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    franchiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    manifestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manifest",
      index: true,
      default: null,
    },
    manifestNumber: { type: String, default: "" },
    loadingSheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoadingSheet",
      index: true,
      default: null,
    },
    loadingSheetNumber: { type: String, default: "" },
    billingReady: { type: Boolean, default: false, index: true },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
      default: null,
    },
    invoiceNumber: { type: String, default: "" },
    trackingHistory: {
      type: [TrackingHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ "route.bookingBranch": 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

export default Booking;
