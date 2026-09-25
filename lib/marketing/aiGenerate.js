const DEFAULT_HASHTAGS = [
  "AssamGoodsCarrier",
  "Logistics",
  "Freight",
  "Transport",
  "Panchkula",
  "NorthEastIndia",
];

export async function generateMarketingPost({ topic, platform, tone = "professional" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const subject = String(topic || "AGC freight and logistics services").trim();
  const targetPlatform = platform || "facebook";

  if (!apiKey) {
    const content = [
      `🚛 Assam Goods Carrier — ${subject}`,
      "",
      "Reliable freight across India with door delivery, godown delivery, and transparent rates.",
      "Book your LR today — Panchkula head office serving consignors nationwide.",
      "",
      "📞 8847428801 | www.assamgoodscarrier.com",
    ].join("\n");
    return {
      content,
      hashtags: DEFAULT_HASHTAGS,
      source: "template",
    };
  }

  const system = [
    "You write short social media posts for Assam Goods Carrier (AGC), a freight and logistics company based in Panchkula, Haryana.",
    "Keep posts under 280 words, friendly and professional, suitable for Indian logistics customers.",
    "Do not invent false claims or prices. Include a soft call-to-action.",
    `Platform: ${targetPlatform}. Tone: ${tone}.`,
    "Respond with JSON only: {\"content\":\"...\",\"hashtags\":[\"tag1\",\"tag2\"]}. Hashtags without # symbol.",
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Topic: ${subject}` },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "AI generation failed";
    throw new Error(message);
  }

  const raw = data?.choices?.[0]?.message?.content || "";
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    const content = String(parsed.content || "").trim();
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean)
      : DEFAULT_HASHTAGS;
    if (!content) throw new Error("Empty content");
    return { content, hashtags, source: "openai" };
  } catch {
    return {
      content: raw.trim() || subject,
      hashtags: DEFAULT_HASHTAGS,
      source: "openai-raw",
    };
  }
}
