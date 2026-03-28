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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  async function deleteDoc(id: string) {
    setDeletingId(id);
    setConfirmDeleteId(null);
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (pathname === `/document/${id}`) router.push("/workspace");
    setDeletingId(null);
  }

  async function renameDoc(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) { setEditingId(null); return; }
    const original = docs.find((d) => d.id === id)?.file_name;
    if (trimmed === original) { setEditingId(null); return; }

    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, file_name: trimmed } : d));
    setEditingId(null);
    window.dispatchEvent(new CustomEvent("doc-renamed", { detail: { id, fileName: trimmed } }));

    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: trimmed }),
    });
  }

  // Listen for renames from the document page
  useEffect(() => {
    function onRenamed(e: Event) {
      const { id, fileName } = (e as CustomEvent).detail;
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, file_name: fileName } : d));
    }
    window.addEventListener("doc-renamed", onRenamed);
    return () => window.removeEventListener("doc-renamed", onRenamed);
  }, []);

  function startEditing(doc: DocEntry) {
    setEditingId(doc.id);
    setEditValue(doc.file_name);
    setTimeout(() => editInputRef.current?.select(), 0);
  }

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
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", fontWeight: 400, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
            Legal<span style={{ color: "#2563eb" }}>Ease</span>
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
            transition: "filter 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.filter = "brightness(1.15)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
            e.currentTarget.style.transform = "translateY(0)";
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
              padding: "0.65rem 0.85rem 0.65rem 2.1rem",
              fontSize: "0.875rem",
              border: "1.5px solid #e5e7eb",
              borderRadius: 9,
              outline: "none",
              color: "#1a1a2e",
              background: "#fafafa",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
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
              const isDeleting = deletingId === doc.id;
              const isEditing = editingId === doc.id;

              return (
                <div
                  key={doc.id}
                  style={{ position: "relative", display: "flex", alignItems: "center", borderRadius: 8 }}
                  className="doc-row"
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector<HTMLElement>(".doc-delete");
                    if (btn) btn.style.opacity = "1";
                    if (!active) e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector<HTMLElement>(".doc-delete");
                    if (btn) btn.style.opacity = "0";
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {isEditing ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.35rem 0.75rem" }}>
                      <span style={{ color: "#2563eb", flexShrink: 0 }}><FileIcon /></span>
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameDoc(doc.id, editValue);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => renameDoc(doc.id, editValue)}
                        style={{
                          flex: 1,
                          fontSize: "0.875rem",
                          border: "1.5px solid #2563eb",
                          borderRadius: 6,
                          padding: "0.25rem 0.5rem",
                          outline: "none",
                          background: "#fff",
                          color: "#1a1a2e",
                          minWidth: 0,
                        }}
                      />
                    </div>
                  ) : (
                    <Link
                      href={`/document/${doc.id}`}
                      title={doc.file_name}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        startEditing(doc);
                      }}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        padding: "0.5rem 2rem 0.5rem 0.75rem",
                        borderRadius: 8,
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        color: active ? "#2563eb" : "#374151",
                        background: active ? "#eff6ff" : "transparent",
                        fontWeight: active ? 600 : 400,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ color: active ? "#2563eb" : "#9ca3af", flexShrink: 0 }}>
                        <FileIcon />
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.file_name}
                      </span>
                    </Link>
                  )}
                  <button
                    className="doc-delete"
                    onClick={() => setConfirmDeleteId(doc.id)}
                    disabled={isDeleting}
                    title="Delete document"
                    style={{
                      position: "absolute",
                      right: "0.4rem",
                      opacity: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      borderRadius: 5,
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      transition: "opacity 0.15s, color 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                  >
                    {isDeleting ? (
                      <span style={{ fontSize: "0.7rem" }}>…</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ margin: "0.75rem 1.25rem", borderTop: "1px solid #e5e7eb" }} />

      {/* ── Settings ── */}
      <div style={{ padding: "0 0.75rem 0.75rem" }}>
        <Link
          href="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: "0.9rem",
            color: pathname === "/settings" ? "#2563eb" : "#374151",
            background: pathname === "/settings" ? "#eff6ff" : "transparent",
            fontWeight: pathname === "/settings" ? 600 : 400,
            transition: "background 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/settings") e.currentTarget.style.background = "#f3f4f6";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/settings") e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span style={{ opacity: 0.7, display: "flex", alignItems: "center" }}><PrefsIcon /></span>
          Settings
        </Link>
      </div>

      {/* ── Logout (dev) ── */}
      <div style={{ padding: "0 0.75rem 1rem" }}>
        <button
          onClick={async () => {
            window.dispatchEvent(new Event("curtain-close"));
            await new Promise((r) => setTimeout(r, 600));
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "none",
            background: "#dc2626",
            color: "#fff",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "filter 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.15)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Sign Out
        </button>
      </div>
      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "1.75rem",
              width: 340,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "0.5rem" }}>
              Delete document?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              &ldquo;{docs.find((d) => d.id === confirmDeleteId)?.file_name}&rdquo; will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDoc(confirmDeleteId)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
