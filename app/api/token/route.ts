// app/api/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt, getLanguageCode } from "@/lib/voice-config";

export async function POST(req: NextRequest) {
  const { documentId, language, readingLevel } = await req.json();

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  // Fetch document text from Supabase
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("raw_text")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Create ephemeral token via Gemini SDK
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    const docText = doc.raw_text?.slice(0, 8000) ?? "";
    const systemPrompt = `${buildSystemPrompt(language, readingLevel)}\n\nDocument content:\n${docText}`;

    return NextResponse.json({
      token: token.name,
      systemPrompt,
      languageCode: getLanguageCode(language),
      voiceName: "Puck",
    });
  } catch (err: any) {
    console.error("Ephemeral token creation failed:", err.message);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 },
    );
  }
}
