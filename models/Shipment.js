import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";
import { SHIPMENT_STATUS } from "@/lib/constants";

const ShipmentSchema = new mongoose.Schema(
  {
    tracking_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
    },
    status: {
      type: String,
      enum: Object.values(SHIPMENT_STATUS),
      default: SHIPMENT_STATUS.PENDING,
      index: true,
    },
    carrier: String,
    carrier_service: String,
    estimated_departure: Date,
    estimated_arrival: Date,
    actual_departure: Date,
    actual_arrival: Date,
    current_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
      description: String,
    },
    tracking_history: [
      {
        status: {
          type: String,
          enum: Object.values(SHIPMENT_STATUS),
        },
        location: String,
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  schemaOptions
);

ShipmentSchema.index({ tracking_number: 1 }, { unique: true });
ShipmentSchema.index({ booking: 1 });
ShipmentSchema.index({ status: 1, estimated_arrival: 1 });

const Shipment =
  mongoose.models.Shipment || mongoose.model("Shipment", ShipmentSchema);

export default Shipment;
