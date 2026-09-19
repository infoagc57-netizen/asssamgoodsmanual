import { amountInWords } from "@/lib/amountInWords";

export const DEFAULT_FREIGHT_HSN_SAC = "996511";
export const SUPPLIER_STATE_CODE = "06";

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function normalizePaymentType(value) {
  const key = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "paid") return "paid";
  if (key === "tbb") return "tbb";
  return "to_pay";
}

export function hasPod(booking) {
  return Boolean(booking?.pod)
    || (booking?.trackingHistory || []).some((entry) => entry.event === "POD Received");
}

export function isBillingReady(booking) {
  if (!booking) return false;
  if (booking.billingReady === true) return true;
  return booking.status === "Delivered" && hasPod(booking);
}

export function isInvoiced(booking) {
  return Boolean(booking?.invoiceId || booking?.invoiceNumber);
}

export function billedParty(booking, paymentType = null) {
  const kind = paymentType || normalizePaymentType(booking?.paymentType);
  if (kind === "to_pay") {
    return booking?.consignee || {};
  }
  return booking?.consignor || {};
}

export function customerKeyForBooking(booking, paymentType = null) {
  const party = billedParty(booking, paymentType);
  return String(party?.name || "").trim().toLowerCase();
}

export function stateCodeFromGstin(gstin) {
  const value = String(gstin || "").trim().toUpperCase();
  if (value.length >= 2 && /^\d{2}/.test(value)) {
    return value.slice(0, 2);
  }
  return "";
}

const STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  25: "Daman & Diu",
  26: "Dadra & Nagar Haveli",
  27: "Maharashtra",
  28: "Andhra Pradesh",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman & Nicobar",
  36: "Telangana",
  37: "Andhra Pradesh (New)",
  38: "Ladakh",
};

export function stateNameFromCode(code) {
  const key = String(code || "").padStart(2, "0").slice(0, 2);
  return STATE_CODES[key] || "";
}

export function financialYearLabel(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function invoiceSeriesForDate(date = new Date()) {
  const fy = financialYearLabel(date);
  return fy ? `INV/${fy}` : "INV";
}

export async function getNextInvoiceSequence(Invoice, invoiceSeries) {
  const last = await Invoice.findOne({ invoiceSeries })
    .sort({ sequenceNumber: -1 })
    .select("sequenceNumber")
    .lean();
  return (last?.sequenceNumber || 0) + 1;
}

export function formatInvoiceNumber(invoiceSeries, sequenceNumber) {
  return `${invoiceSeries}/${String(sequenceNumber).padStart(4, "0")}`;
}

export function deriveTaxType(supplierStateCode, customerStateCode) {
  const supplier = String(supplierStateCode || SUPPLIER_STATE_CODE).padStart(2, "0");
  const customer = String(customerStateCode || "").padStart(2, "0");
  if (!customer) return "intra";
  return supplier === customer ? "intra" : "inter";
}

function chargeNumber(charges, key) {
  return Number(charges?.[key] || 0);
}

export function taxableValueFromBooking(booking) {
  const charges = booking?.charges || {};
  const gstAmount = chargeNumber(charges, "gstOnFreight");
  const grandTotal = Number(booking?.grandTotal || 0);
  if (gstAmount > 0 && grandTotal > gstAmount) {
    return round2(grandTotal - gstAmount);
  }
  const sum = chargeNumber(charges, "freight")
    + chargeNumber(charges, "hamali")
    + chargeNumber(charges, "doorDelivery")
    + chargeNumber(charges, "localCartageCharges")
    + chargeNumber(charges, "selfBuiltyCharge")
    + chargeNumber(charges, "otherCharges");
  return round2(sum || grandTotal);
}

export function splitGst(gstAmount, taxType) {
  const gst = round2(gstAmount);
  if (taxType === "inter") {
    return { cgst: 0, sgst: 0, igst: gst };
  }
  const half = round2(gst / 2);
  const other = round2(gst - half);
  return { cgst: half, sgst: other, igst: 0 };
}

export function buildLineFromBooking(booking, taxType) {
  const charges = booking?.charges || {};
  const route = booking?.route || {};
  const from = route.bookingBranch || "";
  const to = route.deliveryBranch || route.deliveryAt || route.toStation || "";
  const taxableValue = taxableValueFromBooking(booking);
  const gstRate = Number(charges.gstRate ?? 5);
  const gstAmount = round2(charges.gstOnFreight || 0);
  const { cgst, sgst, igst } = splitGst(gstAmount, taxType);
  const total = round2(booking.grandTotal || taxableValue + gstAmount);

  return {
    lrNumber: booking.lrNumber,
    bookingId: booking._id,
    description: `Freight — LR ${booking.lrNumber}${from || to ? ` (${from} → ${to})` : ""}`,
    hsnSac: DEFAULT_FREIGHT_HSN_SAC,
    quantity: 1,
    unit: "LR",
    rate: taxableValue,
    taxableValue,
    gstRate,
    cgst,
    sgst,
    igst,
    total,
  };
}

export function resolveCustomerFields(party, paymentType) {
  const gstin = String(party?.gst || party?.gstin || "").trim().toUpperCase();
  const stateCode = stateCodeFromGstin(gstin) || "";
  const stateName = party?.state || stateNameFromCode(stateCode);
  return {
    customerName: String(party?.name || "").trim() || (paymentType === "to_pay" ? "Consignee" : "Consignor"),
    customerGstin: gstin,
    customerMobile: String(party?.mobile || "").trim(),
    customerEmail: String(party?.email || "").trim(),
    customerAddress: String(party?.address || "").trim(),
    customerCity: String(party?.city || "").trim(),
    customerState: stateName,
    customerPincode: String(party?.pincode || "").trim(),
    customerStateCode: stateCode,
  };
}

export function buildInvoicePayload({
  bookings,
  paymentType,
  invoiceDate,
  dueDate,
  notes,
  terms,
  supplier = {},
}) {
  if (!bookings?.length) {
    throw new Error("Select at least one booking");
  }

  const supplierStateCode = String(supplier.supplierStateCode || SUPPLIER_STATE_CODE).padStart(2, "0");
  const party = billedParty(bookings[0], paymentType);
  const customer = resolveCustomerFields(party, paymentType);
  const placeCode = customer.customerStateCode || supplierStateCode;
  const taxType = deriveTaxType(supplierStateCode, placeCode);
  const lines = bookings.map((b) => buildLineFromBooking(b, taxType));

  const subTotal = round2(lines.reduce((s, line) => s + line.taxableValue, 0));
  const cgstTotal = round2(lines.reduce((s, line) => s + line.cgst, 0));
  const sgstTotal = round2(lines.reduce((s, line) => s + line.sgst, 0));
  const igstTotal = round2(lines.reduce((s, line) => s + line.igst, 0));
  const rawGrand = round2(subTotal + cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(rawGrand);
  const roundOff = round2(grandTotal - rawGrand);

  const parsedDate = invoiceDate ? new Date(invoiceDate) : new Date();
  const invoiceSeries = invoiceSeriesForDate(parsedDate);

  return {
    invoiceSeries,
    invoiceDate: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    dueDate: dueDate ? new Date(dueDate) : null,
    paymentType,
    ...customer,
    supplierName: supplier.supplierName || "ASSAM GOODS CARRIER",
    supplierGstin: supplier.supplierGstin || "06HNAPM3923G1Z3",
    supplierAddress: supplier.supplierAddress || "PLOT NO. 5A IND AREA PHASE 2 PANCHKULA, Haryana - 134113",
    supplierState: supplier.supplierState || "Haryana",
    supplierStateCode,
    placeOfSupply: customer.customerState || stateNameFromCode(placeCode) || supplier.supplierState || "Haryana",
    placeOfSupplyStateCode: placeCode || supplierStateCode,
    lines,
    lrNumbers: bookings.map((b) => b.lrNumber),
    bookingIds: bookings.map((b) => b._id),
    subTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    roundOff,
    grandTotal,
    amountInWords: amountInWords(grandTotal),
    taxType,
    paymentStatus: "Unpaid",
    paidAmount: 0,
    balanceAmount: grandTotal,
    notes: String(notes || "").trim(),
    terms: terms || "Payment due within 15 days. Subject to Panchkula jurisdiction.",
    status: "Issued",
  };
}

export function recomputePaymentStatus(invoice) {
  const grand = round2(invoice.grandTotal);
  const paid = round2(
    (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
  );
  let paymentStatus = "Unpaid";
  if (paid <= 0) paymentStatus = "Unpaid";
  else if (paid >= grand) paymentStatus = "Paid";
  else paymentStatus = "Partial";
  return {
    paidAmount: paid,
    balanceAmount: round2(Math.max(grand - paid, 0)),
    paymentStatus,
  };
}

export function serializeInvoice(doc) {
  if (!doc) return null;
  const invoice = { ...doc };
  if (invoice._id) {
    invoice.id = String(invoice._id);
    delete invoice._id;
  }
  if (invoice.customerId) invoice.customerId = String(invoice.customerId);
  if (invoice.createdBy) invoice.createdBy = String(invoice.createdBy);
  if (invoice.bookingIds) {
    invoice.bookingIds = invoice.bookingIds.map((id) => String(id));
  }
  if (invoice.lines) {
    invoice.lines = invoice.lines.map((line) => ({
      ...line,
      bookingId: line.bookingId ? String(line.bookingId) : null,
    }));
  }
  delete invoice.__v;
  return invoice;
}
