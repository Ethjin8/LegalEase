"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DocEntry {
  id: string;
  file_name: string;
  created_at: string;
}

const FileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const PrefsIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDocs(data))
      .catch(() => {});
  }, [pathname]);

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

  const filtered = search.trim()
    ? docs.filter((d) => d.file_name.toLowerCase().includes(search.toLowerCase()))
    : docs;

  return (
    <aside
      style={{
        width: 280,
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
      <div style={{ padding: "1.75rem 1.5rem 1.25rem" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
            Docu<span style={{ color: "#2563eb" }}>Mentor</span>
          </span>
        </Link>
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.2rem" }}>
          Legal documents, simplified
        </p>
      </div>

      {/* ── Upload button ── */}
      <div style={{ padding: "0 0.75rem 1rem" }}>
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
            padding: "1.1rem 1rem",
            borderRadius: 10,
            border: "none",
            background: uploading
              ? "#93c5fd"
              : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.05rem",
            cursor: uploading ? "wait" : "pointer",
            letterSpacing: "0.01em",
            boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!uploading) (e.currentTarget as HTMLElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            {uploading ? (
              "Uploading…"
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Document
              </>
            )}
          </span>
        </button>
      </div>

      {/* ── Search bar ── */}
      <div style={{ padding: "0 1rem 0.75rem" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: "0.65rem", color: "#9ca3af", pointerEvents: "none", display: "flex" }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.1rem",
              fontSize: "0.85rem",
              border: "1.5px solid #e5e7eb",
              borderRadius: 8,
              outline: "none",
              color: "#1a1a2e",
              background: "#f9fafb",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
          />
        </div>
      </div>

      {/* ── Uploaded files list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "#c4c9d4", padding: "0.5rem 0.65rem 0" }}>
            {search ? "No matches" : "No documents yet"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {filtered.map((doc) => {
              const active = pathname === `/document/${doc.id}`;
              const name = doc.file_name.length > 28
                ? doc.file_name.slice(0, 26) + "…"
                : doc.file_name;

              return (
                <Link
                  key={doc.id}
                  href={`/document/${doc.id}`}
                  title={doc.file_name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: "0.875rem",
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
            gap: "0.65rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: "0.9rem",
            color: pathname === "/preferences" ? "#2563eb" : "#374151",
            background: pathname === "/preferences" ? "#eff6ff" : "transparent",
            fontWeight: pathname === "/preferences" ? 600 : 400,
          }}
        >
          <span style={{ opacity: 0.7 }}><PrefsIcon /></span>
          User Preferences
        </Link>
      </div>

      {/* ── Logout (dev) ── */}
      <div style={{ padding: "0 0.75rem 1rem" }}>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "transparent",
            color: "#6b7280",
            fontSize: "0.82rem",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
