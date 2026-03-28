import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FAQItem } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ── FAQ generation ──────────────────────────────────────────────────────────

export async function generateFAQ(documentText: string): Promise<{
  summary: string;
  items: FAQItem[];
  key_dates: string[];
  obligations: string[];
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a plain-language legal assistant helping immigrants understand documents.

Analyze this legal document and respond with ONLY valid JSON in this exact shape:
{
  "summary": "2-3 sentence plain-language summary of what this document is",
  "items": [
    { "question": "What is this document?", "answer": "..." },
    { "question": "What am I agreeing to?", "answer": "..." },
    { "question": "Are there any deadlines?", "answer": "..." },
    { "question": "What happens if I don't comply?", "answer": "..." },
    { "question": "Are there any fees or costs?", "answer": "..." }
  ],
  "key_dates": ["list of important dates mentioned"],
  "obligations": ["list of things the signer must do"]
}

Use simple language. Avoid legal jargon. Write as if explaining to someone whose first language is not English.

DOCUMENT:
${documentText.slice(0, 8000)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown code fences if present
  const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(jsonText);
}

// ── Single Q&A turn (text) ──────────────────────────────────────────────────

export async function answerQuestion(
  documentText: string,
  question: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  language?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const lang = language && language !== "English" ? language : null;

  const systemText = lang
    ? `You are a plain-language legal assistant. The user has uploaded a legal document.
CRITICAL LANGUAGE RULE: You MUST respond ONLY in ${lang}. Every word of your response must be in ${lang}. Do NOT use English at all. If the user writes in any language, always reply in ${lang}.
Answer questions clearly and simply. Avoid legal jargon. Use plain ${lang}.`
    : `You are a plain-language legal assistant. The user has uploaded a legal document.
Answer questions about it clearly and simply. Avoid jargon.`;

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [
          {
            text: `${systemText} Here is the document:\n\n${documentText.slice(0, 8000)}`,
          },
        ],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'm ready to help explain this document." }],
      },
      ...history,
    ],
  });

  const result = await chat.sendMessage(question);
  return result.response.text();
}

// ── Deep research ───────────────────────────────────────────────────────────

export async function runDeepResearch(
  documentText: string,
  topic: string
): Promise<{ findings: string; sources: { title: string; url: string }[] }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // TODO: enable grounding with Google Search when available in your region
    // tools: [{ googleSearch: {} }],
  });

  const prompt = `Research the following legal topic in the context of this document.
Provide plain-language findings and list any helpful resources (legal aid orgs, government sites).
Respond as JSON: { "findings": "...", "sources": [{ "title": "...", "url": "..." }] }

Topic: ${topic}

Document excerpt:
${documentText.slice(0, 3000)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(text);
}
