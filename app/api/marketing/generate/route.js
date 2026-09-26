import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGeminiClient, parseJsonResponse } from "@/lib/geminiClient";

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

  // 1. PROMPT UPDATE: Ab AI ko professional image prompt banane ka instruction diya hai
  const prompt = `You are a social media expert for "Assam Goods Carrier", a logistics/transport company in India.

Generate 3 social media captions for ${platform} on this topic: "${topic}"

Requirements:
- Tone: ${tone}
- Language: Hinglish (mix of Hindi and English)
- Length: 50-70 words per caption (SHORT AND CRISP)
- Include emojis, bullet points, and a clear call to action
- Mention Assam Goods Carrier and phone 8847428801
- Do NOT use markdown headers

Also generate 15 relevant hashtags.

And generate a highly professional, photorealistic image prompt (in English) for a social media ad.
The image should look like a high-budget Facebook ad: commercial photography, 8k resolution, cinematic lighting, bright daylight, ultra-detailed, realistic truck, clean background, no text.
Example: "A hyper-realistic commercial photograph of a modern cargo truck driving on a scenic highway in Assam, mountains in background, sunny day, 8k, photorealistic, cinematic lighting, facebook ad style"

Return ONLY valid JSON in this exact shape (no extra text, no markdown, no code blocks):
{
  "captions": ["caption 1", "caption 2", "caption 3"],
  "hashtags": ["#tag1", "#tag2"],
  "imagePrompt": "your detailed professional image prompt here"
}`;

  try {
    const groq = getGeminiClient();

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
      max_tokens: 8192,
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonResponse(text);

    // 2. Pollinations.ai ka URL (Enhanced for better quality)
    const imagePrompt = parsed.imagePrompt || `Professional commercial photograph of a cargo truck related to ${topic}, 8k, realistic, facebook ad style`;
    const encodedPrompt = encodeURIComponent(imagePrompt);
    // width, height, nologo aur enhance=true add kiya hai
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 100000)}`;

    return NextResponse.json({
      captions: Array.isArray(parsed.captions) ? parsed.captions.slice(0, 3) : [],
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 30) : [],
      imageUrl: imageUrl, 
    });
  } catch (err) {
    console.error("[marketing/generate]", err);
    return NextResponse.json(
      { error: err.message || "AI generation failed" },
      { status: 500 }
    );
  }
}