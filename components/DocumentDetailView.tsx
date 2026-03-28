"use client";

import { useState, useRef, useEffect } from "react";
import FAQPanel from "@/components/FAQPanel";
import VoiceChat from "@/components/VoiceChat";
import MicOverlay from "@/components/MicOverlay";
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
import { createClient } from "@/lib/supabase/client";
import type { Document, FAQ, ChatMessage } from "@/types";

type View = "faq" | "key_dates" | "obligations" | "raw" | "ask";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "faq",         label: "Overview" },
  { value: "ask",         label: "Ask AI" },
  { value: "key_dates",   label: "Key Dates" },
  { value: "obligations", label: "Your Obligations" },
  { value: "raw",         label: "Full Text" },
];

interface Props {
  doc: Document;
  faq: FAQ | null;
}

export default function DocumentDetailView({ doc, faq }: Props) {
  const [view, setView] = useState<View>("faq");

  // Voice state — owned here so MicOverlay + VoiceChat share it
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [language, setLanguage] = useState<string>("English");
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Fetch user's preferred language
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const lang = user?.user_metadata?.language;
      if (lang) setLanguage(lang);
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
      client.connect(doc.id, language);
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
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.35rem", fontWeight: 400, color: "#1a1a2e", wordBreak: "break-word" }}>
          {doc.file_name}
        </h1>
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
      <div>
        {view === "faq" && <FAQPanel faq={faq} />}

        {view === "key_dates" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "1rem" }}>Key Dates</h2>
            {faq && faq.key_dates.length > 0 ? (
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingLeft: 0, listStyle: "none" }}>
                {faq.key_dates.map((date, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "#eff6ff", color: "#2563eb",
                      fontSize: "0.75rem", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: "0.05rem",
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ color: "#374151", lineHeight: 1.6 }}>{date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>No key dates found in this document.</p>
            )}
          </div>
        )}

        {view === "obligations" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "1rem" }}>Your Obligations</h2>
            {faq && faq.obligations.length > 0 ? (
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingLeft: 0, listStyle: "none" }}>
                {faq.obligations.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#2563eb", flexShrink: 0, marginTop: "0.45rem",
                    }} />
                    <span style={{ color: "#374151", lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>No obligations found in this document.</p>
            )}
          </div>
        )}

        {view === "ask" && (
          <VoiceChat
            documentId={doc.id}
            voiceMessages={voiceMessages}
            voiceState={voiceState}
            voiceError={voiceError}
            language={language}
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
