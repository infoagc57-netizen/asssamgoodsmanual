import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

export function getGeminiClient() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in .env.local");
  }
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

export function getGeminiModel(modelName = "gemini-1.5-flash") {
  return getGeminiClient().getGenerativeModel({ model: modelName });
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