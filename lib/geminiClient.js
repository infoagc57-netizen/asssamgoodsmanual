import Groq from "groq-sdk";

let groq = null;

export function getGeminiClient() {
  if (groq) return groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set in .env.local");
  }
  groq = new Groq({ apiKey });
  return groq;
}

export function parseJsonResponse(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("AI returned invalid JSON");
      }
    }
    throw new Error("AI returned invalid JSON");
  }
}