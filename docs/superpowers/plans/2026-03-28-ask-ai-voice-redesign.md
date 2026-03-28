# Ask AI Voice-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Ask AI page so the mic is the hero element with animated arcs, voice-reactive waveforms, and a secondary text mode — all sharing one conversation.

**Architecture:** VoiceChat.tsx is rewritten as a two-layer stack: a collapsible transcript area on top, and a hero mic area (or text input bar) anchored at the bottom. A new WaveformArcs.tsx component renders two curved SVG arcs that animate based on voice state and audio amplitude. GeminiLiveClient is extended to expose AnalyserNodes for mic input and audio playback.

**Tech Stack:** React, Web Audio API (AnalyserNode), SVG path animations, GeminiLiveClient WebSocket

---

### Task 1: Expose AnalyserNodes in GeminiLiveClient

**Files:**
- Modify: `lib/gemini-live.ts`

- [ ] **Step 1: Add analyser properties and getter methods**

Add two AnalyserNode properties and public getters to `GeminiLiveClient`. The mic analyser taps into the mic input stream. The playback analyser is inserted between audio playback and the destination.

In `lib/gemini-live.ts`, add these properties after the existing `private currentSource` line (around line 23):

```typescript
  private micAnalyser: AnalyserNode | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
```

Add these public methods after the existing `getState()` method (around line 48):

```typescript
  getMicAnalyser(): AnalyserNode | null {
    return this.micAnalyser;
  }

  getPlaybackAnalyser(): AnalyserNode | null {
    return this.playbackAnalyser;
  }
```

- [ ] **Step 2: Create mic analyser in connect()**

In the `connect()` method, after `const source = this.audioContext.createMediaStreamSource(this.mediaStream);` (around line 63), create and connect the mic analyser:

```typescript
      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;
      source.connect(this.micAnalyser);
```

- [ ] **Step 3: Create playback analyser in connect()**

In the `connect()` method, after the mic analyser setup, create the playback analyser:

```typescript
      this.playbackAnalyser = this.audioContext.createAnalyser();
      this.playbackAnalyser.fftSize = 256;
```

- [ ] **Step 4: Route audio playback through the playback analyser**

In `scheduleBuffer()`, change the line `source.connect(this.audioContext.destination);` (around line 219) to route through the playback analyser:

```typescript
    source.connect(this.playbackAnalyser!);
    this.playbackAnalyser!.connect(this.audioContext.destination);
```

- [ ] **Step 5: Clean up analysers in disconnect()**

In `disconnect()`, after `this.workletNode = null;` (around line 251), add:

```typescript
    this.micAnalyser = null;
    this.playbackAnalyser = null;
```

- [ ] **Step 6: Verify the app still compiles**

Run: `cd /Users/ethanjin/DocuMentor && npx next build 2>&1 | tail -20`
Expected: Build succeeds (or only pre-existing warnings)

- [ ] **Step 7: Commit**

```bash
git add lib/gemini-live.ts
git commit -m "feat: expose mic and playback AnalyserNodes in GeminiLiveClient"
```

---

### Task 2: Create WaveformArcs Component

**Files:**
- Create: `components/WaveformArcs.tsx`

- [ ] **Step 1: Create the WaveformArcs component**

This component renders two curved SVG arcs (left and right parenthesis shapes) that animate based on voice state and amplitude data from an AnalyserNode.

Create `components/WaveformArcs.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/lib/gemini-live";

interface Props {
  voiceState: VoiceState;
  analyser: AnalyserNode | null;
}

const ARC_COLOR_IDLE = "#d1d5db";
const ARC_COLOR_ACTIVE = "#2563eb";
const ARC_COLOR_LISTENING = "#ef4444";
const ARC_COLOR_SPEAKING = "#2563eb";

function getArcColor(state: VoiceState): string {
  switch (state) {
    case "listening": return ARC_COLOR_LISTENING;
    case "speaking": return ARC_COLOR_SPEAKING;
    case "connecting":
    case "thinking": return ARC_COLOR_ACTIVE;
    default: return ARC_COLOR_IDLE;
  }
}

function getAmplitude(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

export default function WaveformArcs({ voiceState, analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const smoothAmplitudeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 240;
    const H = 120;
    canvas.width = W * 2; // retina
    canvas.height = H * 2;
    ctx.scale(2, 2);

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      const isActive = voiceState === "listening" || voiceState === "speaking";
      const rawAmp = isActive ? getAmplitude(analyser) : 0;

      // Smooth the amplitude for fluid animation
      const smooth = smoothAmplitudeRef.current;
      smoothAmplitudeRef.current = smooth + (rawAmp - smooth) * 0.15;
      const amp = smoothAmplitudeRef.current;

      const color = getArcColor(voiceState);
      const centerX = W / 2;
      const centerY = H / 2;
      const baseOffset = 40; // distance from center to arc

      // Animate: arcs spread based on amplitude
      const spread = isActive ? amp * 18 : 0;

      // Thinking: converging animation
      const thinkingOffset = voiceState === "thinking"
        ? Math.sin(Date.now() / 400) * 6
        : 0;

      // Connecting: gentle pulse
      const connectPulse = voiceState === "connecting"
        ? Math.sin(Date.now() / 600) * 0.3 + 0.7
        : 1;

      const opacity = voiceState === "idle" ? 0.5 : connectPulse;
      ctx!.globalAlpha = opacity;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2.5;
      ctx!.lineCap = "round";

      // Number of arc segments for waveform effect
      const segments = 8;
      const arcHeight = 50;

      // Left arc — curves like "("
      ctx!.beginPath();
      const leftX = centerX - baseOffset - spread + thinkingOffset;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = centerY - arcHeight / 2 + t * arcHeight;
        const segAmp = isActive ? getSegmentAmplitude(analyser, i, segments) * 10 : 0;
        const curve = Math.sin(t * Math.PI) * 14 + segAmp;
        const x = leftX - curve;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // Right arc — curves like ")"
      ctx!.beginPath();
      const rightX = centerX + baseOffset + spread - thinkingOffset;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = centerY - arcHeight / 2 + t * arcHeight;
        const segAmp = isActive ? getSegmentAmplitude(analyser, i, segments) * 10 : 0;
        const curve = Math.sin(t * Math.PI) * 14 + segAmp;
        const x = rightX + curve;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      ctx!.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [voiceState, analyser]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 240, height: 120, pointerEvents: "none" }}
    />
  );
}

/** Get amplitude for a specific segment from frequency data for waveform shape */
function getSegmentAmplitude(analyser: AnalyserNode | null, segment: number, totalSegments: number): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const binStart = Math.floor((segment / totalSegments) * data.length);
  const binEnd = Math.floor(((segment + 1) / totalSegments) * data.length);
  let sum = 0;
  for (let i = binStart; i < binEnd; i++) {
    sum += data[i];
  }
  const avg = sum / (binEnd - binStart || 1);
  return avg / 255;
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `cd /Users/ethanjin/DocuMentor && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/WaveformArcs.tsx
git commit -m "feat: add WaveformArcs component with audio-reactive SVG animations"
```

---

### Task 3: Rewrite VoiceChat with Voice-First Layout

**Files:**
- Modify: `components/VoiceChat.tsx`

- [ ] **Step 1: Rewrite VoiceChat.tsx**

Replace the entire contents of `components/VoiceChat.tsx` with the new two-layer layout. This preserves all existing logic (GeminiLiveClient setup, text sendMessage, transcript handling) but restructures the UI into voice mode (default) and text mode.

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import WaveformArcs from "@/components/WaveformArcs";
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
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [playbackAnalyser, setPlaybackAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Set up GeminiLiveClient
  useEffect(() => {
    const client = new GeminiLiveClient();
    clientRef.current = client;

    client.on("stateChange", (s) => {
      setVoiceState(s);
      // Grab analysers once connected
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

  function switchToText() {
    setMode("text");
    setTranscriptExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function switchToVoice() {
    setMode("voice");
    setTranscriptExpanded(false);
  }

  // Determine the active analyser based on voice state
  const activeAnalyser = voiceState === "listening" ? micAnalyser
    : voiceState === "speaking" ? playbackAnalyser
    : null;

  // Last user and model messages for minimal transcript
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastModelMsg = [...messages].reverse().find((m) => m.role === "model");

  const showExpanded = mode === "text" || transcriptExpanded;

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
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#1a1a2e",
          letterSpacing: "-0.01em",
          flex: 1,
        }}>
          Ask the Document
        </span>
        {/* Mode indicator */}
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

      {/* ── Transcript Area ── */}
      <div style={{
        flex: showExpanded ? 1 : "0 0 auto",
        overflowY: showExpanded ? "auto" : "hidden",
        transition: "flex 0.3s ease",
      }}>
        {showExpanded ? (
          /* Full expanded chat */
          <div style={{
            padding: "1.25rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            minHeight: "100%",
          }}>
            {messages.length === 0 && mode === "text" && (
              <div style={{ textAlign: "center", marginTop: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
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

            {/* Collapse button (only in voice mode when manually expanded) */}
            {mode === "voice" && (
              <button
                onClick={() => setTranscriptExpanded(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  padding: "0.25rem 0",
                  alignSelf: "center",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Hide conversation
              </button>
            )}
          </div>
        ) : (
          /* Minimal transcript (voice mode, collapsed) */
          <div style={{ padding: "1rem 1.25rem" }}>
            {messages.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
                Tap the mic to start a conversation.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {lastUserMsg && (
                  <p style={{
                    fontSize: "0.85rem",
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                  }}>
                    <span style={{ fontWeight: 600, color: "#2563eb" }}>You: </span>
                    {lastUserMsg.text}
                  </p>
                )}
                {lastModelMsg && (
                  <p style={{
                    fontSize: "0.85rem",
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                  }}>
                    <span style={{ fontWeight: 600, color: "#6b7280" }}>AI: </span>
                    {lastModelMsg.text}
                  </p>
                )}
                <button
                  onClick={() => setTranscriptExpanded(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    padding: "0.15rem 0 0",
                    alignSelf: "flex-start",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  View conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Area: Hero Mic or Text Input ── */}
      {mode === "voice" ? (
        /* Hero mic area */
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1.5rem 1rem 1.25rem",
          borderTop: "1.5px solid #e5e7eb",
          background: "#fafafa",
          gap: "0.5rem",
        }}>
          {/* Arcs + mic button */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WaveformArcs voiceState={voiceState} analyser={activeAnalyser} />
            {/* Mic button centered on top of canvas */}
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
                position: "absolute",
                width: 64,
                height: 64,
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
                transition: "background 0.2s, transform 0.15s",
                boxShadow: voiceState !== "idle"
                  ? "0 0 20px rgba(37, 99, 235, 0.15)"
                  : "0 2px 8px rgba(0,0,0,0.06)",
                animation: voiceState === "listening" ? "mic-pulse 1.5s ease-in-out infinite" : "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {voiceState === "idle" ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              )}
            </button>
          </div>

          {/* Voice state label */}
          {voiceState !== "idle" && (
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {voiceState === "connecting" && "Connecting..."}
              {voiceState === "listening" && "Listening..."}
              {voiceState === "thinking" && "Thinking..."}
              {voiceState === "speaking" && "Speaking..."}
            </span>
          )}

          {/* Switch to text */}
          <button
            onClick={switchToText}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              padding: "0.15rem 0",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
          >
            Switch to text
          </button>
        </div>
      ) : (
        /* Text input area */
        <div style={{
          padding: "0.85rem 1rem",
          borderTop: "1.5px solid #e5e7eb",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "#fafafa",
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
            onClick={switchToVoice}
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
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/ethanjin/DocuMentor && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/VoiceChat.tsx
git commit -m "feat: rewrite VoiceChat with voice-first hero mic layout and text mode toggle"
```

---

### Task 4: Integration Smoke Test

**Files:**
- No file changes — manual verification

- [ ] **Step 1: Run the dev server and verify voice mode renders**

Run: `cd /Users/ethanjin/DocuMentor && npm run dev`

Open the app, navigate to a document, select "Ask AI". Verify:
- Hero mic button (64px) is centered at the bottom
- Two curved arcs flank the mic
- "Switch to text" link appears below the mic
- "Tap the mic to start a conversation" prompt shows in the minimal transcript area
- Header shows "Voice" mode indicator

- [ ] **Step 2: Verify text mode**

Click "Switch to text". Verify:
- Mic area slides out, text input bar appears
- Transcript area expands
- Empty state prompt shows if no messages
- Header shows "Text" mode indicator
- Mic icon button appears next to Send for switching back

- [ ] **Step 3: Verify mode switching preserves messages**

Type and send a message in text mode. Switch to voice. Verify:
- Minimal transcript shows the last exchange
- "View conversation" link appears
- Click it — full transcript with the message bubble is shown
- Switch back to text — message is still there

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A && git commit -m "fix: integration fixes for voice-first Ask AI redesign"
```
