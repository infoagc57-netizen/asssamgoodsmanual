import mongoose from "mongoose";

const ManifestSchema = new mongoose.Schema(
  {
    manifestNumber: { type: String, required: true, unique: true, index: true },
    date: { type: Date, default: Date.now },
    fromBranch: { type: String, default: "" },
    toBranch: { type: String, default: "" },
    truckNumber: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverMobile: { type: String, default: "" },
    transporterName: { type: String, default: "" },
    notes: { type: String, default: "" },
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
    lrNumbers: [String],
    totalBookings: { type: Number, default: 0 },
    totalPackages: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Dispatched", "Received", "Cancelled"],
      default: "Draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ManifestSchema.index({ createdAt: -1 });

const Manifest = mongoose.models.Manifest || mongoose.model("Manifest", ManifestSchema);

export default Manifest;
