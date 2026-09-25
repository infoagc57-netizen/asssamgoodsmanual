import SocialPost from "@/models/SocialPost";

const PLATFORMS = new Set(["facebook", "instagram", "linkedin", "all"]);
const STATUSES = new Set(["draft", "scheduled", "published", "failed"]);

export function serializeSocialPost(doc) {
  if (!doc) return null;
  const row = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(row._id),
    platform: row.platform || "facebook",
    topic: row.topic || "",
    content: row.content || "",
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    imageUrl: row.imageUrl || "",
    status: row.status || "draft",
    scheduledAt: row.scheduledAt || null,
    publishedAt: row.publishedAt || null,
    externalPostId: row.externalPostId || "",
    externalError: row.externalError || "",
    reach: row.reach ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function normalizeSocialPostInput(body) {
  const platform = PLATFORMS.has(body?.platform) ? body.platform : "facebook";
  const status = STATUSES.has(body?.status) ? body.status : "draft";
  const content = String(body?.content || "").trim();
  const topic = String(body?.topic || "").trim();
  const hashtags = Array.isArray(body?.hashtags)
    ? body.hashtags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(body?.hashtags || "")
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, "").trim())
      .filter(Boolean);

  let scheduledAt = null;
  if (body?.scheduledAt) {
    const parsed = new Date(body.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) scheduledAt = parsed;
  }

  return {
    platform,
    topic,
    content,
    hashtags,
    imageUrl: String(body?.imageUrl || "").trim(),
    status,
    scheduledAt,
  };
}

export async function listSocialPosts({ status, limit = 50 } = {}) {
  const query = {};
  if (status && STATUSES.has(status)) query.status = status;
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const rows = await SocialPost.find(query).sort({ createdAt: -1 }).limit(cap).lean();
  return rows.map(serializeSocialPost);
}

export async function getSocialPostById(id) {
  const row = await SocialPost.findById(id).lean();
  return serializeSocialPost(row);
}

export async function createSocialPost(input, userId) {
  if (!input.content) {
    throw new Error("Post content is required.");
  }
  const doc = await SocialPost.create({
    ...input,
    createdBy: userId || undefined,
  });
  return serializeSocialPost(doc);
}

export async function updateSocialPost(id, input) {
  const existing = await SocialPost.findById(id);
  if (!existing) return null;
  if (input.content !== undefined) existing.content = input.content;
  if (input.topic !== undefined) existing.topic = input.topic;
  if (input.platform !== undefined && PLATFORMS.has(input.platform)) existing.platform = input.platform;
  if (input.hashtags !== undefined) existing.hashtags = input.hashtags;
  if (input.imageUrl !== undefined) existing.imageUrl = input.imageUrl;
  if (input.status !== undefined && STATUSES.has(input.status)) existing.status = input.status;
  if (input.scheduledAt !== undefined) existing.scheduledAt = input.scheduledAt;
  await existing.save();
  return serializeSocialPost(existing);
}

export async function deleteSocialPost(id) {
  const result = await SocialPost.findByIdAndDelete(id);
  return Boolean(result);
}

export async function findDueScheduledPosts(now = new Date()) {
  const rows = await SocialPost.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(20)
    .lean();
  return rows;
}
