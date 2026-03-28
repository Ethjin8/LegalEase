import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion } from "@/lib/gemini";
import type { ChatMessage } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { documentId, question, history, language } = await req.json();

  if (!documentId || !question) {
    return NextResponse.json(
      { error: "documentId and question required" },
      { status: 400 }
    );
  }

  // Fetch document text
  const { data: doc, error } = await supabase
    .from("documents")
    .select("raw_text")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Map chat history to Gemini format
  const geminiHistory = (history as ChatMessage[]).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const answer = await answerQuestion(doc.raw_text, question, geminiHistory, language);

  return NextResponse.json({ answer });
}
