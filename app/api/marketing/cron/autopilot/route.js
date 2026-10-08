import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await dbConnect();
    const results = { published: [], autoPublished: [], newPostGenerated: false };

    // KAAM 1: Scheduled posts jo time nikal chuke hain, unko publish karo
    const now = new Date();
    const duePosts = await SocialPost.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });

    for (let post of duePosts) {
      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `${post.content}\n\n${(post.hashtags || []).join(" ")}`,
              link: post.imageUrl || undefined,
              access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
            }),
          }
        );
        const fbData = await fbRes.json();

        if (fbRes.ok) {
          post.status = "published";
          post.publishedAt = new Date();
          post.externalPostId = fbData.id || "";
          await post.save();
          results.published.push(post._id);
        } else {
          post.status = "failed";
          post.externalError = fbData.error?.message || "Facebook publish failed";
          await post.save();
        }
      } catch (err) {
        post.status = "failed";
        post.externalError = err.message;
        await post.save();
      }
    }

    // KAAM 2: Purani pending_approval posts (2 ghante se zyada) auto-publish
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oldPending = await SocialPost.find({
      status: "pending_approval",
      createdAt: { $lte: twoHoursAgo },
    });

    for (let post of oldPending) {
      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `${post.content}\n\n${(post.hashtags || []).join(" ")}`,
              link: post.imageUrl || undefined,
              access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
            }),
          }
        );
        const fbData = await fbRes.json();

        if (fbRes.ok) {
          post.status = "published";
          post.publishedAt = new Date();
          post.externalPostId = fbData.id || "";
          await post.save();
          results.autoPublished.push(post._id);
        } else {
          post.status = "failed";
          post.externalError = fbData.error?.message || "Facebook publish failed";
          await post.save();
        }
      } catch (err) {
        post.status = "failed";
        post.externalError = err.message;
        await post.save();
      }
    }

    // KAAM 3: Agar koi pending_approval post nahi hai, toh nayi generate karo
    const existingPending = await SocialPost.findOne({ status: "pending_approval" });
    if (!existingPending) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const genRes = await fetch(`${baseUrl}/api/marketing/autopilot`, {
        method: "POST",
      });
      if (genRes.ok) results.newPostGenerated = true;
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[cron/autopilot]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}