import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/constants";

const BookingSchema = new mongoose.Schema(
  {
    booking_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.DRAFT,
      index: true,
    },
    payment_status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
    },
    booking_date: {
      type: Date,
      default: Date.now,
    },
    expected_delivery_date: {
      type: Date,
    },
    origin_address: {
      type: String,
      required: [true, "Origin address is required"],
    },
    origin_city: String,
    origin_state: String,
    origin_postal_code: String,
    origin_country: String,
    destination_address: {
      type: String,
      required: [true, "Destination address is required"],
    },
    destination_city: String,
    destination_state: String,
    destination_postal_code: String,
    destination_country: String,
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
    },
    volume: {
      type: Number,
      min: [0, "Volume cannot be negative"],
    },
    total_amount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },
    notes: String,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  schemaOptions
);

BookingSchema.index({ booking_number: 1 }, { unique: true });
BookingSchema.index({ customer: 1, status: 1 });
BookingSchema.index({ booking_date: -1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

export default Booking;
