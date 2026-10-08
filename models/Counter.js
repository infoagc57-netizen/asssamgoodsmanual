import mongoose from "mongoose";
import schemaOptions from "@/lib/schemaOptions";

const CounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  schemaOptions,
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export default Counter;
