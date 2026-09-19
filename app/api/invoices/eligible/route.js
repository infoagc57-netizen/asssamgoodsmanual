import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { serializeBooking } from "@/lib/serializeBooking";
import {
  billedParty,
  isBillingReady,
  isInvoiced,
  normalizePaymentType,
} from "@/lib/invoiceService";

export const dynamic = "force-dynamic";

// GET /api/invoices/eligible?paymentType=tbb
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paymentType = normalizePaymentType(req.nextUrl.searchParams.get("paymentType") || "tbb");
  if (paymentType === "paid") {
    return NextResponse.json({ bookings: [] });
  }

  await dbConnect();

  const candidates = await Booking.find({
    $or: [{ invoiceId: null }, { invoiceId: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const bookings = candidates
    .filter((booking) => {
      if (isInvoiced(booking)) return false;
      if (!isBillingReady(booking)) return false;
      return normalizePaymentType(booking.paymentType) === paymentType;
    })
    .map((booking) => {
      const serialized = serializeBooking(booking);
      const party = billedParty(booking, paymentType);
      return {
        ...serialized,
        billedCustomerName: party?.name || "",
        billedCustomerGst: party?.gst || "",
      };
    });

  return NextResponse.json({ bookings, paymentType });
}
