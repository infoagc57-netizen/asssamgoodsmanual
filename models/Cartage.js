import mongoose from "mongoose";

const CartageSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    month: { type: String, index: true }, // "2026-09" for fast queries
    lrNumber: { type: String, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    amount: { type: Number, required: true, min: 0 },
    vendorName: { type: String, default: "" }, // Cartage vendor / driver
    vendorMobile: { type: String, default: "" },
    vehicleNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-set month field from date
CartageSchema.pre("save", function (next) {
  if (this.date) {
    const d = new Date(this.date);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  next();
});

export default mongoose.models.Cartage ||
  mongoose.model("Cartage", CartageSchema);
