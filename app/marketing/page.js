"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const NAVY = "#071B34";
const ORANGE = "#F97316";

export default function MarketingPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("facebook");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [captions, setCaptions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [selectedCaption, setSelectedCaption] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [toast, setToast] = useState("");

  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("all");

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/marketing/posts", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic first");
      return;
    }
    setLoading(true);
    setError("");
    setCaptions([]);
    setHashtags([]);
    setSelectedCaption("");
    setSelectedHashtags([]);

    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setCaptions(data.captions || []);
      setHashtags(data.hashtags || []);
      setSelectedHashtags(data.hashtags || []);
      setSelectedCaption(data.captions?.[0] || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleHashtag = (tag) => {
    setSelectedHashtags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const savePost = async (status) => {
    if (!selectedCaption.trim()) {
      setError("Please select or write a caption");
      return;
    }
    try {
      const res = await fetch("/api/marketing/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          topic,
          content: selectedCaption,
          hashtags: selectedHashtags,
          imageUrl,
          scheduledAt: scheduledAt || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setToast(status === "scheduled" ? "Post scheduled!" : "Saved as draft!");
      setTimeout(() => setToast(""), 3000);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const publishNow = async (postId) => {
    try {
      const res = await fetch("/api/marketing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");

      setToast("Published to Facebook!");
      setTimeout(() => setToast(""), 3000);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/marketing/posts/${postId}`, { method: "DELETE" });
    fetchPosts();
  };

  const filteredPosts = posts.filter((p) => (tab === "all" ? true : p.status === tab));

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
            Marketing Assistant
          </h1>
          <p className="text-sm text-slate-500">
            Generate AI-powered posts and publish to Facebook
          </p>
        </div>

        {toast && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: INPUT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              Content Generation
            </h2>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Topic / Idea
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Pharma freight from Chandigarh to Guwahati"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="urgent">Urgent</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white mb-5 disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              {loading ? "Generating..." : "🧠 Generate Captions with AI"}
            </button>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {captions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  AI Suggestions — click to select
                </h3>
                <div className="space-y-2 mb-4">
                  {captions.map((cap, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedCaption(cap)}
                      className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                        selectedCaption === cap
                          ? "border-orange-400 bg-orange-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {cap}
                    </div>
                  ))}
                </div>

                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hashtags — click to toggle
                </h3>
                <div className="flex flex-wrap gap-1">
                  {hashtags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleHashtag(tag)}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        selectedHashtags.includes(tag)
                          ? "bg-[#071B34] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PREVIEW + ACTIONS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              Preview & Publish
            </h2>

            {selectedCaption ? (
              <div className="mb-4 rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Asssam Goods Carrier
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap mb-2">
                  {selectedCaption}
                </div>
                <div className="text-xs text-blue-600">
                  {selectedHashtags.join(" ")}
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="mt-3 w-full rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                Generate captions to see preview
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Image URL (optional)
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Schedule At (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => savePost("draft")}
                disabled={!selectedCaption}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => savePost("scheduled")}
                disabled={!selectedCaption || !scheduledAt}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>

        {/* POSTS LIST */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex gap-2 mb-4">
            {["all", "draft", "scheduled", "published", "failed"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase ${
                  tab === t ? "bg-[#071B34] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No posts yet
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((p) => (
                <div
                  key={p._id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {p.platform}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "published"
                            ? "bg-green-100 text-green-700"
                            : p.status === "scheduled"
                            ? "bg-orange-100 text-orange-700"
                            : p.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 truncate">
                      {p.content?.substring(0, 100)}
                      {p.content?.length > 100 ? "..." : ""}
                    </div>
                    {p.scheduledAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        Scheduled: {new Date(p.scheduledAt).toLocaleString()}
                      </div>
                    )}
                    {p.externalError && (
                      <div className="text-xs text-red-500 mt-1">
                        Error: {p.externalError}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {p.status !== "published" && (
                      <button
                        onClick={() => publishNow(p._id)}
                        className="rounded-lg bg-green-600 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => deletePost(p._id)}
                      className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}