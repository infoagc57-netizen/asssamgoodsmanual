import mongoose from "mongoose";

const PartySchema = new mongoose.Schema(
  {
    partyType: {
      type: String,
      enum: ["consignor", "consignee", "both"],
      default: "both",
    },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    gst: { type: String, trim: true, uppercase: true },
    pincode: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    address: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUsedAt: { type: Date, default: Date.now },
    usageCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

PartySchema.index({ name: "text", mobile: "text", gst: "text" });
PartySchema.index({ mobile: 1 });
PartySchema.index({ gst: 1 });
PartySchema.index({ name: 1 });

export default mongoose.models.Party || mongoose.model("Party", PartySchema);
