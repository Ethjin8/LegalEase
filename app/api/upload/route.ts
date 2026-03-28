import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFAQ } from "@/lib/gemini";
import pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Extract text
    let rawText = "";
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else {
      rawText = await file.text();
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file. Try a clearer image or PDF." },
        { status: 422 }
      );
    }

    // 2. Upload file to Supabase Storage
    const filePath = `documents/${Date.now()}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (storageError) {
      console.error("Storage error:", storageError);
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    // 3. Save document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        file_name: file.name,
        file_url: urlData?.publicUrl ?? "",
        raw_text: rawText,
      })
      .select()
      .single();

    if (docError || !doc) {
      console.error("Document insert error:", docError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    // 4. Generate FAQ
    const faqData = await generateFAQ(rawText);

    const { data: faq, error: faqError } = await supabase
      .from("faqs")
      .insert({
        document_id: doc.id,
        ...faqData,
      })
      .select()
      .single();

    if (faqError) {
      console.error("FAQ insert error:", faqError);
    }

    return NextResponse.json({ document: doc, faq: faq ?? faqData });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
