"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DocumentUpload from "@/components/DocumentUpload";

export default function WorkspaceView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Upload failed. Please try again.");
        return;
      }

      router.push(`/document/${json.document.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#f9fafb",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", fontWeight: 400, marginBottom: "0.5rem" }}>
          Docu<span style={{ color: "#2563eb" }}>Mentor</span>
        </h1>
        <p style={{ color: "#4b5563", marginBottom: "2.5rem", fontSize: "1.1rem", fontWeight: 300, letterSpacing: "0.04em" }}>
          Upload a legal document. We&apos;ll explain it in plain language — no jargon.
        </p>

        <DocumentUpload onUpload={handleUpload} loading={loading} />

        {error && (
          <p style={{ color: "#dc2626", marginTop: "1rem", fontSize: "0.95rem" }}>
            {error}
          </p>
        )}

        <p style={{ color: "#9ca3af", marginTop: "2rem", fontSize: "0.85rem" }}>
          Supports PDF, images (JPG, PNG), and text files.
        </p>
      </div>
    </main>
  );
}
