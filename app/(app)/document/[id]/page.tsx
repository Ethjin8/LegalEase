"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FAQPanel from "@/components/FAQPanel";
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
import type { ChatMessage, Document, FAQ } from "@/types";

type View = "faq" | "key_dates" | "obligations" | "raw" | "ask";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "faq",          label: "FAQ Overview" },
  { value: "key_dates",    label: "Key Dates" },
  { value: "obligations",  label: "Your Obligations" },
  { value: "raw",          label: "Full Document Text" },
  { value: "ask",          label: "Ask AI" },
];

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [doc, setDoc] = useState<Document | null>(null);
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [view, setView] = useState<View>("faq");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Ask AI
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Voice chat
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    const client = new GeminiLiveClient();
    clientRef.current = client;

    client.on("stateChange", setVoiceState);
    client.on("transcript", (t) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === t.role) {
          return [...prev.slice(0, -1), { ...last, text: last.text + t.text }];
        }
        return [...prev, { role: t.role, text: t.text, timestamp: new Date() }];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    client.on("error", (err) => {
      console.error("Voice error:", err);
      setVoiceError(err);
      setTimeout(() => setVoiceError(null), 5000);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    async function load() {
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (docError || !docData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setDoc(docData);

      const { data: faqData } = await supabase
        .from("faqs")
        .select("*")
        .eq("document_id", id)
        .single();

      setFaq(faqData ?? null);
      setLoading(false);
    }

    load();
  }, [id]);

  async function sendQuestion() {
    if (!question.trim() || asking || !id) return;
    const userMsg: ChatMessage = { role: "user", text: question.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setAsking(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id, question: userMsg.text, history: messages }),
      });
      const json = await res.json();
      const aiMsg: ChatMessage = { role: "model", text: json.answer ?? json.error ?? "No response.", timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { role: "model", text: "Something went wrong. Please try again.", timestamp: new Date() }]);
    } finally {
      setAsking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  if (loading) return (
    <div style={{ padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>Loading…</div>
  );

  if (notFound) return (
    <div style={{ padding: "3rem", color: "#dc2626", fontSize: "0.9rem" }}>Document not found.</div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Document
        </p>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1a1a2e", wordBreak: "break-word" }}>
          {doc?.file_name}
        </h1>
        {doc?.created_at && (
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
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", height: 520 }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {messages.length === 0 && (
                <p style={{ color: "#9ca3af", fontSize: "0.88rem", margin: "auto", textAlign: "center" }}>
                  Ask anything about this document.
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%",
                    padding: "0.65rem 1rem",
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: msg.role === "user" ? "#2563eb" : "#f3f4f6",
                    color: msg.role === "user" ? "#fff" : "#1a1a2e",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {asking && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "0.65rem 1rem", borderRadius: "12px 12px 12px 2px", background: "#f3f4f6", color: "#9ca3af", fontSize: "0.88rem" }}>
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Voice error banner */}
            {voiceError && (
              <div style={{
                padding: "0.5rem 1rem",
                background: "#fef2f2",
                borderTop: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.82rem",
              }}>
                {voiceError}
              </div>
            )}

            {/* Input */}
            <div style={{ borderTop: "1px solid #e5e7eb", padding: "0.85rem 1rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {/* Mic button */}
              <button
                onClick={() => {
                  const client = clientRef.current;
                  if (!client) return;
                  if (voiceState === "idle") {
                    client.connect(id);
                  } else {
                    client.disconnect();
                  }
                }}
                title={voiceState === "idle" ? "Start voice chat" : "Stop voice chat"}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "none",
                  background:
                    voiceState === "idle"
                      ? "#f3f4f6"
                      : voiceState === "connecting"
                      ? "#fef3c7"
                      : voiceState === "listening"
                      ? "#fee2e2"
                      : voiceState === "speaking"
                      ? "#dbeafe"
                      : "#f3f4f6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                  animation: voiceState === "listening" ? "mic-pulse 1.5s ease-in-out infinite" : "none",
                }}
              >
                {voiceState === "idle" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                )}
              </button>

              {/* Voice state label */}
              {voiceState !== "idle" && (
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0 }}>
                  {voiceState === "connecting" && "Connecting…"}
                  {voiceState === "listening" && "Listening…"}
                  {voiceState === "thinking" && "Thinking…"}
                  {voiceState === "speaking" && "Speaking…"}
                </span>
              )}

              {/* Text input */}
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
                placeholder="Ask a question about this document…"
                disabled={asking}
                style={{
                  flex: 1,
                  padding: "0.6rem 0.85rem",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: "0.88rem",
                  outline: "none",
                  color: "#1a1a2e",
                }}
              />
              <button
                onClick={sendQuestion}
                disabled={asking || !question.trim()}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: 8,
                  border: "none",
                  background: asking || !question.trim() ? "#93c5fd" : "#2563eb",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: asking || !question.trim() ? "default" : "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
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
                {doc?.raw_text}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
