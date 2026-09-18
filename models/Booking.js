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
    grandTotal: {
      type: Number,
      default: 0,
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
