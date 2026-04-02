// OCR + text extraction utilities
// Supports: PDF (pdf-parse, Gemini fallback for scanned), images (Gemini vision), plain text

import { extractTextWithGemini } from "./gemini";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractFromPDF(file);
  }

  if (IMAGE_EXTENSIONS.includes(ext ?? "")) {
    return extractFromImage(file);
  }

  // Plain text fallback
  return file.text();
}

async function extractFromPDF(file: File): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);

  // If pdf-parse extracted meaningful text, use it
  if (data.text.trim().length > 50) {
    return data.text;
  }

  // Scanned/image-based PDF — fall back to Gemini vision
  const base64 = buffer.toString("base64");
  return extractTextWithGemini(base64, "application/pdf");
}

async function extractFromImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || `image/${file.name.split(".").pop()?.toLowerCase()}`;
  return extractTextWithGemini(base64, mimeType);
}
