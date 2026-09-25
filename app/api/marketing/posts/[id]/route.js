import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const post = await SocialPost.findById(params.id).lean();
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const update = {};

  ["content", "hashtags", "imageUrl", "status", "platform", "topic"].forEach((key) => {
    if (body[key] !== undefined) update[key] = body[key];
  });

  if (body.scheduledAt !== undefined) {
    update.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  }

  await dbConnect();
  const post = await SocialPost.findByIdAndUpdate(params.id, update, { new: true });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const post = await SocialPost.findByIdAndDelete(params.id);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}