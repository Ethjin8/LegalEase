"use client";

import { useState, useRef, useEffect } from "react";
import FAQPanel from "@/components/FAQPanel";
import VoiceChat from "@/components/VoiceChat";
import MicOverlay from "@/components/MicOverlay";
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
import { createClient } from "@/lib/supabase/client";
import type { Document, FAQ, ChatMessage } from "@/types";

type View = "faq" | "raw" | "ask";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "faq",  label: "Overview" },
  { value: "ask",  label: "Ask AI" },
  { value: "raw",  label: "Full Text" },
];

interface Props {
  doc: Document;
  faq: FAQ | null;
}

export default function DocumentDetailView({ doc, faq }: Props) {
  const [view, setView] = useState<View>("faq");
  const [fileName, setFileName] = useState(doc.file_name);
  const [editingName, setEditingName] = useState(false);
  const [editValue, setEditValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setEditingName(true);
    setEditValue(fileName);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function saveName(newName: string) {
    const trimmed = newName.trim();
    setEditingName(false);
    if (!trimmed || trimmed === fileName) return;

    setFileName(trimmed);
    window.dispatchEvent(new CustomEvent("doc-renamed", { detail: { id: doc.id, fileName: trimmed } }));
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: trimmed }),
    });
  }

  // Listen for renames from the sidebar
  useEffect(() => {
    function onRenamed(e: Event) {
      const { id, fileName: newName } = (e as CustomEvent).detail;
      if (id === doc.id) setFileName(newName);
    }
    window.addEventListener("doc-renamed", onRenamed);
    return () => window.removeEventListener("doc-renamed", onRenamed);
  }, [doc.id]);

  // Voice state — owned here so MicOverlay + VoiceChat share it
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [language, setLanguage] = useState<string>("English");
  const [readingLevel, setReadingLevel] = useState<number>(2);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Fetch user's preferred language and reading level
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const lang = user.user_metadata?.language;
      if (lang) setLanguage(lang);

      const { data: profile } = await supabase
        .from("profiles")
        .select("reading_level")
        .eq("id", user.id)
        .single();
      if (profile?.reading_level) setReadingLevel(profile.reading_level);
    });
  }, []);

  // Set up GeminiLiveClient
  useEffect(() => {
    const client = new GeminiLiveClient();
    clientRef.current = client;

    client.on("stateChange", (s) => {
      setVoiceState(s);
    });
    client.on("transcript", (t) => {
      setVoiceMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === t.role) {
          return [...prev.slice(0, -1), { ...last, text: last.text + t.text }];
        }
        return [...prev, { role: t.role, text: t.text, timestamp: new Date() }];
      });
    });
    client.on("error", (err) => {
      console.error("Voice error:", err);
      setVoiceError(err);
      setTimeout(() => setVoiceError(null), 5000);
    });

    return () => { client.disconnect(); };
  }, []);

  function handleMicToggle() {
    const client = clientRef.current;
    if (!client) return;
    if (voiceState === "idle") {
      client.connect(doc.id, language, readingLevel);
    } else {
      client.disconnect();
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem", paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Document
        </p>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName(editValue);
              if (e.key === "Escape") setEditingName(false);
            }}
            onBlur={() => saveName(editValue)}
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.35rem",
              fontWeight: 400,
              color: "#1a1a2e",
              border: "1.5px solid #2563eb",
              borderRadius: 8,
              padding: "0.2rem 0.5rem",
              outline: "none",
              width: "100%",
              background: "#fff",
            }}
          />
        ) : (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
            onDoubleClick={startEditing}
          >
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.35rem", fontWeight: 400, color: "#1a1a2e", wordBreak: "break-word", margin: 0 }}>
              {fileName}
            </h1>
            <button
              onClick={startEditing}
              title="Rename document"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem",
                borderRadius: 4,
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          </div>
        )}
        {doc.created_at && (
          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.2rem" }}>
            Uploaded {new Date(doc.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* ── Dropdown ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <select
          value={view}
          onChange={e => setView(e.target.value as View)}
          style={{
            padding: "0.55rem 2.25rem 0.55rem 0.85rem",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: "0.9rem",
            color: "#1a1a2e",
            background: "#fff",
            cursor: "pointer",
            outline: "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.65rem center",
          }}
        >
          {VIEW_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Content area ── */}
      <div style={{ paddingBottom: (view === "ask" || view === "raw") ? "2rem" : 0 }}>
        {view === "faq" && <FAQPanel faq={faq} />}

        {view === "ask" && (
          <VoiceChat
            documentId={doc.id}
            voiceMessages={voiceMessages}
            voiceState={voiceState}
            voiceError={voiceError}
            language={language}
            readingLevel={readingLevel}
          />
        )}

        {view === "raw" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>Full Document Text</h2>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Scroll to read</span>
            </div>
            <div style={{ height: 480, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
              <pre style={{
                fontFamily: "'Merriweather', serif",
                fontSize: "0.85rem",
                lineHeight: 1.8,
                color: "#374151",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}>
                {doc.raw_text}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Mic overlay — always visible ── */}
      <MicOverlay voiceState={voiceState} onToggle={handleMicToggle} />
    </div>
  );
}
