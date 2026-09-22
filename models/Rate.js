import mongoose from "mongoose";

const RateSchema = new mongoose.Schema(
  {
    toStation: { type: String, required: true, trim: true, index: true },
    toBranch: { type: String, default: "" },
    toBranchName: { type: String, default: "" },
    fromBranch: { type: String, default: "" },
    fromBranchName: { type: String, default: "All" },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "General Rate" },
    generalRate: { type: Boolean, default: true, index: true },
    rate: { type: Number, required: true, min: 0 },
    rateType: { type: String, default: "Per Kg" },
    minFreight: { type: Number, default: 0 },
    godownAddress: { type: String, default: "" },
    godownMobile: { type: String, default: "" },
    effectiveFrom: { type: String, default: "" },
    status: { type: String, default: "Active", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

RateSchema.index({ toStation: 1, customerId: 1, status: 1 });

export default mongoose.models.Rate || mongoose.model("Rate", RateSchema);
