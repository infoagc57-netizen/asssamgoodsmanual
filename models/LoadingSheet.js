import mongoose from "mongoose";

const LoadingSheetSchema = new mongoose.Schema(
  {
    manifestNumber: { type: String, required: true, unique: true, index: true },
    date: { type: Date, default: Date.now },
    departureTime: { type: String, default: "" },
    fromBranch: { type: String, default: "" },
    toBranch: { type: String, default: "" },
    truckNumber: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverMobile: { type: String, default: "" },
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
    lrNumbers: [String],
    totalBookings: { type: Number, default: 0 },
    totalPackages: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Dispatched", "In Transit", "Received", "Cancelled"],
      default: "Draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

LoadingSheetSchema.index({ createdAt: -1 });

const LoadingSheet = mongoose.models.LoadingSheet || mongoose.model("LoadingSheet", LoadingSheetSchema);

export default LoadingSheet;
