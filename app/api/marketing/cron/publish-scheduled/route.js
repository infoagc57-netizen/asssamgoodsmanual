import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function publishToFacebook(post) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error("Facebook credentials missing");

  const fullText = `${post.content}\n\n${(post.hashtags || []).join(" ")}`.trim();

  const endpoint = post.imageUrl
    ? `https://graph.facebook.com/v20.0/${pageId}/photos`
    : `https://graph.facebook.com/v20.0/${pageId}/feed`;

  const params = new URLSearchParams({
    access_token: token,
    message: fullText,
  });
  if (post.imageUrl) params.append("url", post.imageUrl);

  const res = await fetch(endpoint, { method: "POST", body: params });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || "Facebook publish failed");
  }
  return data.id || data.post_id || "";
}

export async function GET(req) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const now = new Date();
  const due = await SocialPost.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  }).limit(20);

  const results = [];

  for (const post of due) {
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

      results.push({ id: post._id, ok: true, externalId });
    } catch (err) {
      post.status = "failed";
      post.externalError = err.message;
      await post.save();
      results.push({ id: post._id, ok: false, error: err.message });
    }
  }

  return NextResponse.json({ checked: due.length, results });
}