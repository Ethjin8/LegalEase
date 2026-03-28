"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface DocEntry {
  id: string;
  file_name: string;
  created_at: string;
}

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const PrefsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDocs(data))
      .catch(() => {});
  }, [pathname]); // re-fetch when navigating (catches new uploads)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok) {
        router.push(`/document/${json.document.id}`);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <aside
      style={{
        width: 248,
        minHeight: "100vh",
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: "1.5rem 1.25rem 1.25rem" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
            Docu<span style={{ color: "#2563eb" }}>Mentor</span>
          </span>
        </Link>
        <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>
          Legal documents, simplified
        </p>
      </div>

      {/* ── Uploaded files list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem" }}>
        {docs.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "#c4c9d4", padding: "0.5rem 0.5rem 0" }}>
            No documents yet
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {docs.map((doc) => {
              const active = pathname === `/document/${doc.id}`;
              // Trim long filenames
              const name = doc.file_name.length > 26
                ? doc.file_name.slice(0, 24) + "…"
                : doc.file_name;

              return (
                <Link
                  key={doc.id}
                  href={`/document/${doc.id}`}
                  title={doc.file_name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.45rem 0.65rem",
                    borderRadius: 7,
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    color: active ? "#2563eb" : "#374151",
                    background: active ? "#eff6ff" : "transparent",
                    fontWeight: active ? 600 : 400,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span style={{ color: active ? "#2563eb" : "#9ca3af" }}>
                    <FileIcon />
                  </span>
                  {name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ margin: "0.75rem 1.25rem", borderTop: "1px solid #e5e7eb" }} />

      {/* ── User Preferences ── */}
      <div style={{ padding: "0 0.75rem 0.75rem" }}>
        <Link
          href="/preferences"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.5rem 0.65rem",
            borderRadius: 7,
            textDecoration: "none",
            fontSize: "0.85rem",
            color: pathname === "/preferences" ? "#2563eb" : "#374151",
            background: pathname === "/preferences" ? "#eff6ff" : "transparent",
            fontWeight: pathname === "/preferences" ? 600 : 400,
          }}
        >
          <span style={{ opacity: 0.7 }}><PrefsIcon /></span>
          User Preferences
        </Link>
      </div>

      {/* ── Upload button ── */}
      <div style={{ padding: "0 0.75rem 1.25rem" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: "100%",
            padding: "0.85rem 1rem",
            borderRadius: 10,
            border: "none",
            background: uploading
              ? "#93c5fd"
              : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: uploading ? "wait" : "pointer",
            letterSpacing: "0.01em",
            boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
            transition: "opacity 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!uploading) (e.currentTarget as HTMLElement).style.opacity = "0.92";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
        >
          {uploading ? "Uploading…" : "Upload Document"}
        </button>
      </div>
    </aside>
  );
}
