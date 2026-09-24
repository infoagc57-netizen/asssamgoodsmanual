import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import {
  buildInvoicePayload,
  customerKeyForBooking,
  formatInvoiceNumber,
  getNextInvoiceSequence,
  isBillingReady,
  isInvoiced,
  normalizePaymentType,
  serializeInvoice,
} from "@/lib/invoiceService";

export const dynamic = "force-dynamic";

function invoiceListQuery(searchParams) {
  const query = {};
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const search = String(searchParams.get("search") || "").trim();
  const month = searchParams.get("month");

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    query.invoiceDate = { $gte: start, $lt: end };
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    query.invoiceDate = query.invoiceDate || {};
    if (from) query.invoiceDate.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.invoiceDate.$lte = end;
    }
  }

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { invoiceNumber: regex },
      { customerName: regex },
      { customerGstin: regex },
      { lrNumbers: regex },
    ];
  }

  return query;
}

// GET /api/invoices
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
  const query = invoiceListQuery(searchParams);

  const invoices = await Invoice.find(query)
    .sort({ invoiceDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    invoices: invoices.map(serializeInvoice),
  });
}

// POST /api/invoices
export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const paymentType = normalizePaymentType(body.paymentType || "tbb");
  if (paymentType === "paid") {
    return NextResponse.json({ error: "Paid LRs are not invoiced here" }, { status: 400 });
  }

  const lrNumbers = [...new Set(
    (Array.isArray(body.lrNumbers) ? body.lrNumbers : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];

  if (!lrNumbers.length) {
    return NextResponse.json({ error: "Select at least one LR" }, { status: 400 });
  }

  await dbConnect();

  const bookings = await Booking.find({ lrNumber: { $in: lrNumbers } }).lean();
  if (bookings.length !== lrNumbers.length) {
    const found = new Set(bookings.map((b) => b.lrNumber));
    const missing = lrNumbers.filter((lr) => !found.has(lr));
    return NextResponse.json({ error: `Bookings not found: ${missing.join(", ")}` }, { status: 400 });
  }

  const orderMap = new Map(bookings.map((b) => [b.lrNumber, b]));
  const ordered = lrNumbers.map((lr) => orderMap.get(lr));

  const blocked = ordered.filter((b) => !isBillingReady(b) || isInvoiced(b));
  if (blocked.length) {
    return NextResponse.json(
      { error: `Not billable or already invoiced: ${blocked.map((b) => b.lrNumber).join(", ")}` },
      { status: 400 },
    );
  }

  const wrongPayment = ordered.filter((b) => normalizePaymentType(b.paymentType) !== paymentType);
  if (wrongPayment.length) {
    return NextResponse.json(
      { error: `Payment type mismatch for: ${wrongPayment.map((b) => b.lrNumber).join(", ")}` },
      { status: 400 },
    );
  }

  const customerKeys = new Set(ordered.map((b) => customerKeyForBooking(b, paymentType)));
  if (customerKeys.size > 1) {
    return NextResponse.json({ error: "Select LRs for the same billed customer only" }, { status: 400 });
  }

  const party = ordered[0] ? (paymentType === "to_pay" ? ordered[0].consignee : ordered[0].consignor) : null;
  let customerId = null;
  if (party?.name) {
    const gst = String(party.gst || "").trim().toUpperCase();
    const customer = gst
      ? await Customer.findOne({ tax_id: gst }).select("_id").lean()
      : await Customer.findOne({ company_name: new RegExp(`^${String(party.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("_id").lean();
    if (customer) customerId = customer._id;
  }

  const payload = buildInvoicePayload({
    bookings: ordered,
    paymentType,
    invoiceDate: body.invoiceDate,
    dueDate: body.dueDate,
    notes: body.notes,
    terms: body.terms,
  });

  const sequenceNumber = await getNextInvoiceSequence(Invoice, payload.invoiceSeries);
  const invoiceNumber = formatInvoiceNumber(payload.invoiceSeries, sequenceNumber);

  const invoice = await Invoice.create({
    ...payload,
    invoiceNumber,
    sequenceNumber,
    customerId,
    createdBy: session.user.id,
  });

  await Booking.updateMany(
    { lrNumber: { $in: lrNumbers } },
    {
      $set: {
        invoiceId: invoice._id,
        invoiceNumber,
        billingReady: true,
      },
    },
  );

  const fresh = await Invoice.findById(invoice._id).lean();
  return NextResponse.json({ invoice: serializeInvoice(fresh) }, { status: 201 });
}
