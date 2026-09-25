import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGeminiModel, parseJsonResponse } from "@/lib/geminiClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { topic, tone = "professional", platform = "facebook" } = body;

  if (!topic || !String(topic).trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const prompt = `You are a social media expert for "Assam Goods Carrier", a logistics/transport company in India moving freight from North India to Northeast and back.

Generate 3 social media captions for ${platform} on this topic: "${topic}"

Requirements:
- Tone: ${tone}
- Language: Hinglish (mix of Hindi and English)
- Length: 100-150 words per caption
- Include emojis, bullet points, and a clear call to action
- Mention Assam Goods Carrier and phone 8847428801
- Do NOT use markdown headers

Also generate 25 relevant hashtags.

Return ONLY valid JSON in this exact shape (no extra text):
{
  "captions": ["caption 1", "caption 2", "caption 3"],
  "hashtags": ["#tag1", "#tag2"]
}`;

  try {
    const model = getGeminiModel("gemini-1.5-flash-latest");
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseJsonResponse(text);

    return NextResponse.json({
      captions: Array.isArray(parsed.captions) ? parsed.captions.slice(0, 3) : [],
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 30) : [],
    });
  } catch (err) {
    console.error("[marketing/generate]", err);
    return NextResponse.json(
      { error: err.message || "AI generation failed" },
      { status: 500 }
    );
  }
}