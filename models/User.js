import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";
import { USER_ROLES } from "@/lib/constants";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.OPERATOR,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    passwordHash: {
      type: String,
      select: false,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    failedLoginCount: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
    },
    last_login: {
      type: Date,
    },
  },
  schemaOptions
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
