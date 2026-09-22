import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { createRate, listRates } from "@/lib/rateService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const rates = await listRates({ status: status || undefined, q: q || undefined });
  return NextResponse.json({ rates });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const rateValue = Number(body.rate);
  const minFreight = body.minFreight === "" || body.minFreight === undefined ? 0 : Number(body.minFreight);

  if (!body.generalRate && !body.customerId) {
    return NextResponse.json({ error: "Select a customer or mark this as a General Rate." }, { status: 400 });
  }
  if (!body.fromBranch || !body.toBranch || !body.rateType) {
    return NextResponse.json({ error: "From Branch, To Branch and Rate Type are required." }, { status: 400 });
  }
  if (body.fromBranch === body.toBranch) {
    return NextResponse.json({ error: "From Branch and To Branch cannot be the same." }, { status: 400 });
  }
  if (!Number.isFinite(rateValue) || rateValue <= 0) {
    return NextResponse.json({ error: "Rate must be greater than 0." }, { status: 400 });
  }
  if (!Number.isFinite(minFreight) || minFreight < 0) {
    return NextResponse.json({ error: "Minimum Freight cannot be negative." }, { status: 400 });
  }

  await dbConnect();
  try {
    const rate = await createRate(
      {
        customerId: body.generalRate ? "" : body.customerId,
        customerName: body.customerName || "General Rate",
        generalRate: Boolean(body.generalRate),
        fromBranch: body.fromBranch,
        fromBranchName: body.fromBranchName || body.fromBranch,
        toBranch: body.toBranch,
        toBranchName: body.toBranchName || body.toBranch,
        toStation: body.toStation || body.toBranch,
        rate: rateValue,
        rateType: body.rateType,
        minFreight,
        godownAddress: body.godownAddress || "",
        godownMobile: body.godownMobile || "",
        effectiveFrom: body.effectiveFrom,
        status: body.status || "Active",
      },
      session.user.id,
    );
    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    if (error.message === "DUPLICATE_ACTIVE") {
      return NextResponse.json(
        { error: "An active rate already exists for this customer, route and rate type." },
        { status: 409 },
      );
    }
    throw error;
  }
}
