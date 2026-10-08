import { NextResponse } from "next/server";
import { getGeminiClient, parseJsonResponse } from "@/lib/geminiClient";
import { dbConnect } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await dbConnect();
    const groq = getGeminiClient();

    const prompt = `You are a social media manager for "Assam Goods Carrier", a logistics company in India (routes: Chandigarh, Panchkula, Ambala, Kala Amb to Assam/Guwahati).
    
    Generate a fresh, engaging social media post for Facebook for today.
    
    Requirements:
    - Choose a topic relevant to logistics, transport, or the current season/festival.
    - Language: Hinglish (Hindi + English).
    - Length: 50-70 words.
    - Include emojis, bullet points, and a call to action.
    - Mention phone 8847428801.
    - Generate 15 hashtags.
    - Generate a highly professional, photorealistic image prompt (in English) for a Facebook ad.
    
    Return ONLY valid JSON in this exact shape (no extra text, no markdown, no code blocks):
    {
      "topic": "Your chosen topic",
      "captions": ["caption 1"],
      "hashtags": ["#tag1", "#tag2"],
      "imagePrompt": "your detailed image prompt here"
    }`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that outputs only valid JSON. No markdown, no code blocks, no extra text."
        },
        { role: "user", content: prompt }
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonResponse(text);

    const imagePrompt = parsed.imagePrompt || `Commercial photo of a cargo truck related to ${parsed.topic}`;
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 100000)}`;

    const newPost = await SocialPost.create({
      platform: "facebook",
      topic: parsed.topic || "Daily Logistics Update",
      content: parsed.captions?.[0] || "Assam Goods Carrier - Trusted Logistics Partner",
      hashtags: parsed.hashtags || [],
      imageUrl: imageUrl,
      status: "pending_approval",
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (err) {
    console.error("[autopilot/generate]", err);
    return NextResponse.json(
      { error: err.message || "Autopilot generation failed" },
      { status: 500 }
    );
  }
}