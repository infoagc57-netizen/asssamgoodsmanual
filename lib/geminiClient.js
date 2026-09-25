import { GoogleGenAI } from "@google/genai";

let ai = null;

export function getGeminiClient() {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in .env.local");
  }
  ai = new GoogleGenAI({ apiKey });
  return ai;
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