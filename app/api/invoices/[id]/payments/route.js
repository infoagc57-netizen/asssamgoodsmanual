import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { recomputePaymentStatus, serializeInvoice } from "@/lib/invoiceService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function invoiceQuery(id) {
  const key = decodeURIComponent(id || "").trim();
  if (mongoose.Types.ObjectId.isValid(key)) {
    return { $or: [{ _id: key }, { invoiceNumber: key }] };
  }
  return { invoiceNumber: key };
}

// POST /api/invoices/:id/payments
export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
  }

  await dbConnect();
  const invoice = await Invoice.findOne(invoiceQuery(id));
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "Cancelled") {
    return NextResponse.json({ error: "Cannot record payment on cancelled invoice" }, { status: 400 });
  }

  const payment = {
    date: body.date ? new Date(body.date) : new Date(),
    amount,
    mode: String(body.mode || "Cash").trim(),
    ref: String(body.ref || "").trim(),
    remarks: String(body.remarks || "").trim(),
    receivedBy: String(body.receivedBy || session.user.name || "").trim(),
    createdAt: new Date(),
  };

  invoice.payments = [...(invoice.payments || []), payment];
  const totals = recomputePaymentStatus(invoice);
  invoice.paidAmount = totals.paidAmount;
  invoice.balanceAmount = totals.balanceAmount;
  invoice.paymentStatus = totals.paymentStatus;

  await invoice.save();
  return NextResponse.json({ invoice: serializeInvoice(invoice.toObject()) });
}
