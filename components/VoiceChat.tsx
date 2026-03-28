"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
import type { ChatMessage } from "@/types";

interface Props {
  documentId: string;
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "0.2rem 0.1rem" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#9ca3af",
            display: "inline-block",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function VoiceChat({ documentId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice chat
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Set up GeminiLiveClient
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

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: text, history: messages }),
      });

      const json = await res.json();
      const answer = json.answer ?? "Sorry, I couldn't get an answer. Please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "model", text: answer, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Connection error. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      style={{
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: "#e5e7eb",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        height: 560,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1.5px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span style={{
          fontFamily: "'Source Sans 3', sans-serif",
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#1a1a2e",
          letterSpacing: "-0.01em",
        }}>
          Ask the Document
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.25rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p style={{ color: "#9ca3af", fontSize: "0.88rem", fontFamily: "'Source Sans 3', sans-serif", maxWidth: 220, lineHeight: 1.6 }}>
              Ask anything about this document — in any language.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}
          >
            {msg.role === "user" ? (
              <div style={{
                background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                color: "#fff",
                borderRadius: "14px 14px 3px 14px",
                padding: "0.65rem 1rem",
                fontSize: "0.9rem",
                fontFamily: "'Source Sans 3', sans-serif",
                lineHeight: 1.6,
              }}>
                {msg.text}
              </div>
            ) : (
              <div style={{
                background: "#f9fafb",
                borderWidth: "1.5px",
                borderStyle: "solid",
                borderColor: "#e5e7eb",
                borderRadius: "3px 14px 14px 14px",
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontFamily: "'Merriweather', serif",
                lineHeight: 1.8,
                color: "#1a1a2e",
              }}>
                <MarkdownRenderer>{msg.text}</MarkdownRenderer>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: "flex-start",
            background: "#f9fafb",
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: "#e5e7eb",
            borderRadius: "3px 14px 14px 14px",
            padding: "0.65rem 1rem",
          }}>
            <TypingIndicator />
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
      <div
        style={{
          padding: "0.85rem 1rem",
          borderTop: "1.5px solid #e5e7eb",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "#fafafa",
        }}
      >
        {/* Mic button */}
        <button
          onClick={() => {
            const client = clientRef.current;
            if (!client) return;
            if (voiceState === "idle") {
              client.connect(documentId);
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
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask a question…"
          disabled={loading}
          style={{
            flex: 1,
            border: "1.5px solid #e5e7eb",
            borderRadius: 9,
            padding: "0.65rem 0.85rem",
            fontSize: "0.9rem",
            fontFamily: "'Source Sans 3', sans-serif",
            outline: "none",
            background: "#fff",
            color: "#1a1a2e",
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
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "0.65rem 1.1rem",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.9rem",
            fontFamily: "'Source Sans 3', sans-serif",
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: "opacity 0.15s",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
