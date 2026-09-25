import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { publishDueScheduledPosts } from "@/lib/marketing/publishSocial";

export const dynamic = "force-dynamic";

function authorizeCron(req) {
  const secret = process.env.MARKETING_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const results = await publishDueScheduledPosts();
  return NextResponse.json({
    processed: results.length,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });
}
