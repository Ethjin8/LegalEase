"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import WaveformArcs from "@/components/WaveformArcs";
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
import { createClient } from "@/lib/supabase/client";
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

function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
      {msg.role === "user" ? (
        <div style={{
          background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
          color: "#fff",
          borderRadius: "14px 14px 3px 14px",
          padding: "0.65rem 1rem",
          fontSize: "0.9rem",
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.6,
        }}>
          {msg.text}
        </div>
      ) : (
        <div style={{
          background: "#f9fafb",
          border: "1.5px solid #e5e7eb",
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
  );
}

export default function VoiceChat({ documentId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [playbackAnalyser, setPlaybackAnalyser] = useState<AnalyserNode | null>(null);
  const [language, setLanguage] = useState<string>("English");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      if (s === "listening") {
        setMicAnalyser(client.getMicAnalyser());
        setPlaybackAnalyser(client.getPlaybackAnalyser());
      } else if (s === "idle") {
        setMicAnalyser(null);
        setPlaybackAnalyser(null);
      }
    });
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

    return () => { client.disconnect(); };
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
        body: JSON.stringify({ documentId, question: text, history: messages, language }),
      });
      const json = await res.json();
      const answer = json.answer ?? "Sorry, I couldn't get an answer. Please try again.";
      setMessages((prev) => [...prev, { role: "model", text: answer, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "Connection error. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const activeAnalyser = voiceState === "listening" ? micAnalyser
    : voiceState === "speaking" ? playbackAnalyser
    : null;

  return (
    <div
      style={{
        border: "1.5px solid #e5e7eb",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        height: 560,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1.5px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#1a1a2e",
          letterSpacing: "-0.01em",
          flex: 1,
        }}>
          Ask the Document
        </span>
        <span style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {mode === "voice" ? "Voice" : "Text"}
        </span>
      </div>

      {/* ── Voice error banner ── */}
      {voiceError && (
        <div style={{
          padding: "0.5rem 1rem",
          background: "#fef2f2",
          borderBottom: "1px solid #fecaca",
          color: "#dc2626",
          fontSize: "0.82rem",
        }}>
          {voiceError}
        </div>
      )}

      {/* ── Chat messages (always visible) ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.25rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p style={{ color: "#9ca3af", fontSize: "0.88rem", fontFamily: "'Inter', sans-serif", maxWidth: 220, lineHeight: 1.6 }}>
              Ask anything about this document — in any language.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div style={{
            alignSelf: "flex-start",
            background: "#f9fafb",
            border: "1.5px solid #e5e7eb",
            borderRadius: "3px 14px 14px 14px",
            padding: "0.65rem 1rem",
          }}>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Bottom: Voice and Text input (crossfade) ── */}
      <div style={{ borderTop: "1.5px solid #e5e7eb", background: "#fafafa", position: "relative", overflow: "hidden" }}>
        {/* Voice layer */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0.75rem 1rem",
          gap: "0.35rem",
          opacity: mode === "voice" ? 1 : 0,
          transform: mode === "voice" ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: mode === "voice" ? "auto" : "none",
          position: mode === "voice" ? "relative" : "absolute",
          inset: mode === "voice" ? undefined : 0,
        }}>
          {/* Waveform arcs with mic button centered */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <WaveformArcs voiceState={voiceState} analyser={activeAnalyser} width={400} />
            <button
              onClick={() => {
                const client = clientRef.current;
                if (!client) return;
                if (voiceState === "idle") client.connect(documentId, language);
                else client.disconnect();
              }}
              title={voiceState === "idle" ? "Start voice chat" : "Stop voice chat"}
              style={{
                position: "absolute",
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                background:
                  voiceState === "idle" ? "#f3f4f6"
                    : voiceState === "connecting" ? "#fef3c7"
                    : voiceState === "listening" ? "#fee2e2"
                    : voiceState === "speaking" ? "#dbeafe"
                    : "#f3f4f6",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.15s",
                boxShadow: voiceState !== "idle"
                  ? "0 0 16px rgba(37, 99, 235, 0.15)"
                  : "0 2px 6px rgba(0,0,0,0.06)",
                animation: voiceState === "listening" ? "mic-pulse 1.5s ease-in-out infinite" : "none",
                zIndex: 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {voiceState === "idle" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              )}
            </button>
          </div>

          {/* Voice state label */}
          {voiceState !== "idle" && (
            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
              {voiceState === "connecting" && "Connecting..."}
              {voiceState === "listening" && "Listening..."}
              {voiceState === "thinking" && "Thinking..."}
              {voiceState === "speaking" && "Speaking..."}
            </span>
          )}

          {/* Switch to text */}
          <button
            onClick={() => { setMode("text"); setTimeout(() => inputRef.current?.focus(), 100); }}
            style={{
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: 8,
              color: "#6b7280",
              fontSize: "0.72rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              padding: "0.35rem 0.85rem",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.color = "#2563eb";
              e.currentTarget.style.background = "#eff6ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.color = "#6b7280";
              e.currentTarget.style.background = "#fff";
            }}
          >
            Switch to text
          </button>
        </div>

        {/* Text layer */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.85rem 1rem",
          opacity: mode === "text" ? 1 : 0,
          transform: mode === "text" ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: mode === "text" ? "auto" : "none",
          position: mode === "text" ? "relative" : "absolute",
          inset: mode === "text" ? undefined : 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask a question..."
            disabled={loading}
            style={{
              flex: 1,
              border: "1.5px solid #e5e7eb",
              borderRadius: 9,
              padding: "0.65rem 0.85rem",
              fontSize: "0.9rem",
              fontFamily: "'Inter', sans-serif",
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
              fontFamily: "'Inter', sans-serif",
              opacity: loading || !input.trim() ? 0.5 : 1,
              transition: "opacity 0.15s",
              flexShrink: 0,
            }}
          >
            Send
          </button>
          <button
            onClick={() => setMode("voice")}
            title="Switch to voice"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.background = "#eff6ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.background = "#fff";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
