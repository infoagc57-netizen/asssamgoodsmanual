import mongoose from "mongoose";

const InvoiceLineSchema = new mongoose.Schema(
  {
    lrNumber: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    description: String,
    hsnSac: String,
    quantity: Number,
    unit: String,
    rate: Number,
    taxableValue: Number,
    gstRate: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    total: Number,
  },
  { _id: false },
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    invoiceSeries: { type: String, default: "" }, // "INV/2026-27"
    sequenceNumber: { type: Number, default: 0 }, // 1, 2, 3...

    invoiceDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, default: null },

    paymentType: { type: String, default: "tbb" }, // tbb | to_pay

    // Customer (billed to)
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, required: true },
    customerGstin: { type: String, default: "" },
    customerMobile: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    customerCity: { type: String, default: "" },
    customerState: { type: String, default: "" },
    customerPincode: { type: String, default: "" },

    // Supplier (AGC)
    supplierName: { type: String, default: "ASSAM GOODS CARRIER" },
    supplierGstin: { type: String, default: "06HNAPM3923G1Z3" },
    supplierAddress: {
      type: String,
      default: "PLOT NO. 5A IND AREA PHASE 2 PANCHKULA, Haryana - 134113",
    },
    supplierState: { type: String, default: "Haryana" },
    supplierStateCode: { type: String, default: "06" },

    // Place of supply
    placeOfSupply: { type: String, default: "" },
    placeOfSupplyStateCode: { type: String, default: "" },

    // Line items (one per LR)
    lines: [InvoiceLineSchema],

    // LR references
    lrNumbers: [String],
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],

    // Totals
    subTotal: { type: Number, default: 0 },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Amount in words
    amountInWords: { type: String, default: "" },

    // Tax type
    taxType: { type: String, enum: ["intra", "inter"], default: "intra" },

    // Payment tracking
    paymentStatus: { type: String, enum: ["Unpaid", "Partial", "Paid"], default: "Unpaid" },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    payments: [
      {
        date: Date,
        amount: Number,
        mode: String,
        ref: String,
        remarks: String,
        receivedBy: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    notes: { type: String, default: "" },
    terms: {
      type: String,
      default: "Payment due within 15 days. Subject to Panchkula jurisdiction.",
    },

    status: { type: String, enum: ["Draft", "Issued", "Cancelled"], default: "Issued" },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

InvoiceSchema.index({ customerName: 1, invoiceDate: -1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ invoiceSeries: 1, sequenceNumber: 1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
