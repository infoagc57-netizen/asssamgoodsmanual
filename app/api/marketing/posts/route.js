import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

  await dbConnect();
  const query = {};
  if (status) query.status = status;

  const posts = await SocialPost.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ posts });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    platform = "facebook",
    topic = "",
    content,
    hashtags = [],
    imageUrl = "",
    scheduledAt = null,
    status = "draft",
  } = body;

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  await dbConnect();

  const post = await SocialPost.create({
    platform,
    topic,
    content: String(content).trim(),
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    imageUrl: String(imageUrl || "").trim(),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    status,
    createdBy: session.user.id,
  });

  return NextResponse.json({ post }, { status: 201 });
}