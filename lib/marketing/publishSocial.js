import SocialPost from "@/models/SocialPost";
import { serializeSocialPost } from "@/lib/marketing/socialPostService";

function buildPostMessage(post) {
  const tags = (post.hashtags || [])
    .map((tag) => (String(tag).startsWith("#") ? tag : `#${tag}`))
    .join(" ");
  return tags ? `${post.content}\n\n${tags}` : post.content;
}

async function publishToFacebook(message) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    return { ok: false, error: "Facebook credentials not configured (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN)." };
  }

  const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || "Facebook publish failed" };
  }
  return { ok: true, externalPostId: String(data.id || "") };
}

export async function publishSocialPostDocument(postDoc) {
  const message = buildPostMessage(postDoc);
  const platform = postDoc.platform || "facebook";

  if (platform === "instagram" || platform === "linkedin") {
    await SocialPost.findByIdAndUpdate(postDoc._id, {
      status: "failed",
      externalError: `${platform} publishing is not configured yet. Save as draft or use Facebook.`,
    });
    const updated = await SocialPost.findById(postDoc._id).lean();
    return { ok: false, post: serializeSocialPost(updated) };
  }

  const result = await publishToFacebook(message);
  if (!result.ok) {
    await SocialPost.findByIdAndUpdate(postDoc._id, {
      status: "failed",
      externalError: result.error,
    });
    const updated = await SocialPost.findById(postDoc._id).lean();
    return { ok: false, post: serializeSocialPost(updated) };
  }

  await SocialPost.findByIdAndUpdate(postDoc._id, {
    status: "published",
    publishedAt: new Date(),
    externalPostId: result.externalPostId,
    externalError: "",
  });
  const updated = await SocialPost.findById(postDoc._id).lean();
  return { ok: true, post: serializeSocialPost(updated) };
}

export async function publishDueScheduledPosts() {
  const { findDueScheduledPosts } = await import("@/lib/marketing/socialPostService");
  const due = await findDueScheduledPosts();
  const results = [];
  for (const row of due) {
    const outcome = await publishSocialPostDocument(row);
    results.push(outcome);
  }
  return results;
}
