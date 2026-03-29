// app/api/token/route.ts
import { NextRequest, NextResponse } from "next/server";
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

  // Create ephemeral token via Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const tokenRes = await fetch(
    `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expire_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    },
  );

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error("Ephemeral token creation failed:", tokenRes.status, detail);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 },
    );
  }

  const tokenData = await tokenRes.json();
  const docText = doc.raw_text?.slice(0, 8000) ?? "";
  const systemPrompt = `${buildSystemPrompt(language, readingLevel)}\n\nDocument content:\n${docText}`;

  return NextResponse.json({
    token: tokenData.name,
    systemPrompt,
    languageCode: getLanguageCode(language),
    voiceName: "Puck",
  });
}
