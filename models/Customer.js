import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";

const CustomerSchema = new mongoose.Schema(
  {
    customer_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    company_name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    contact_name: {
      type: String,
      required: [true, "Contact name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
    tax_id: String,
    credit_limit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    notes: String,
  },
  schemaOptions
);

CustomerSchema.index({ customer_code: 1 }, { unique: true });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ company_name: "text", contact_name: "text" });

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default Customer;
