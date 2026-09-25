import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function publishToFacebook(post) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    throw new Error("Facebook credentials not configured");
  }

  const fullText = `${post.content}\n\n${(post.hashtags || []).join(" ")}`.trim();

  const endpoint = post.imageUrl
    ? `https://graph.facebook.com/v20.0/${pageId}/photos`
    : `https://graph.facebook.com/v20.0/${pageId}/feed`;

  const params = new URLSearchParams({
    access_token: token,
    message: fullText,
  });
  if (post.imageUrl) params.append("url", post.imageUrl);

  const res = await fetch(endpoint, {
    method: "POST",
    body: params,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || "Facebook publish failed");
  }

  return data.id || data.post_id || "";
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { postId } = body;

  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  await dbConnect();
  const post = await SocialPost.findById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  try {
    let externalId = "";
    if (post.platform === "facebook" || post.platform === "all") {
      externalId = await publishToFacebook(post);
    }

    post.status = "published";
    post.publishedAt = new Date();
    post.externalPostId = externalId;
    post.externalError = "";
    await post.save();

    return NextResponse.json({ success: true, post });
  } catch (err) {
    console.error("[marketing/publish]", err);
    post.status = "failed";
    post.externalError = err.message;
    await post.save();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}