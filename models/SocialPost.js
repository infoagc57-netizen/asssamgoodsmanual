import mongoose from "mongoose";

const SocialPostSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["facebook", "instagram", "linkedin", "all"],
      default: "facebook",
    },
    topic: { type: String, default: "" },
    content: { type: String, required: true },
    hashtags: [String],
    imageUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "failed"],
      default: "draft",
      index: true,
    },
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
    externalPostId: { type: String, default: "" },
    externalError: { type: String, default: "" },
    reach: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SocialPostSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.models.SocialPost ||
  mongoose.model("SocialPost", SocialPostSchema);