import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Booking from "@/models/Booking";
import { recomputePaymentStatus, serializeInvoice } from "@/lib/invoiceService";

export const dynamic = "force-dynamic";

function invoiceQuery(id) {
  const key = decodeURIComponent(id || "").trim();
  if (mongoose.Types.ObjectId.isValid(key)) {
    return { $or: [{ _id: key }, { invoiceNumber: key }] };
  }
  return { invoiceNumber: key };
}

// GET /api/invoices/:id
export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  const invoice = await Invoice.findOne(invoiceQuery(id)).lean();
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice: serializeInvoice(invoice) });
}

// PUT /api/invoices/:id — update notes, cancel, etc.
export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  await dbConnect();

  const invoice = await Invoice.findOne(invoiceQuery(id));
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "Cancelled") {
    return NextResponse.json({ error: "Cancelled invoice cannot be edited" }, { status: 400 });
  }

  if (body.status === "Cancelled") {
    invoice.status = "Cancelled";
    invoice.cancelledAt = new Date();
    invoice.cancelReason = String(body.cancelReason || "").trim();
    await invoice.save();

    await Booking.updateMany(
      { invoiceId: invoice._id },
      { $set: { invoiceId: null, invoiceNumber: "" } },
    );

    return NextResponse.json({ invoice: serializeInvoice(invoice.toObject()) });
  }

  if (body.notes !== undefined) invoice.notes = String(body.notes || "").trim();
  if (body.terms !== undefined) invoice.terms = String(body.terms || "").trim();
  if (body.dueDate !== undefined) {
    invoice.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  await invoice.save();
  return NextResponse.json({ invoice: serializeInvoice(invoice.toObject()) });
}

// DELETE /api/invoices/:id — draft only
export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const invoice = await Invoice.findOne(invoiceQuery(id));
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "Draft") {
    return NextResponse.json({ error: "Only draft invoices can be deleted. Cancel issued invoices instead." }, { status: 400 });
  }

  await Booking.updateMany(
    { invoiceId: invoice._id },
    { $set: { invoiceId: null, invoiceNumber: "" } },
  );

  await invoice.deleteOne();
  return NextResponse.json({ success: true });
}
