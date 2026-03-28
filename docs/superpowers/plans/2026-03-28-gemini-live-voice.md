# Gemini Live Voice Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time voice conversation to document Q&A via a Node WebSocket proxy that relays audio between the browser and the Gemini Live API.

**Architecture:** Browser connects to a Node `ws` server on port 3001. On connect, the client sends an `init` message with a `documentId`. The proxy fetches the document text from Supabase, opens a WebSocket to Gemini Live with the document as system context, then transparently relays all subsequent messages. The client handles mic capture, audio playback, and UI state.

**Tech Stack:** Node.js + `ws` (proxy), browser Web Audio API + `getUserMedia` (client), Gemini Live WebSocket API (`models/gemini-3.0-flash-live-preview`), Supabase JS client (document fetch).

---

## File Structure

| File | Role |
|------|------|
| `server/gemini-live-proxy.ts` | Node WebSocket server. Receives client connections, fetches document from Supabase, opens Gemini Live session, relays messages bidirectionally. |
| `lib/gemini-live.ts` | Client-side `GeminiLiveClient` class. Manages WebSocket to proxy, mic capture via `getUserMedia` + AudioWorklet, audio playback via Web Audio API, voice state machine, event emitter. |
| `lib/pcm-worklet.js` | AudioWorklet processor that downsamples mic input to 16kHz PCM. Runs in audio thread. |
| `app/(app)/document/[id]/page.tsx` | UI changes — mic button in "Ask AI" input bar, voice state indicator, transcript messages. |

---

## Task 1: Install dependencies and set up proxy entry point

**Files:**
- Modify: `package.json`
- Create: `server/gemini-live-proxy.ts`

- [ ] **Step 1: Install ws and tsx**

```bash
npm install ws && npm install -D @types/ws tsx
```

`ws` is the WebSocket server library. `tsx` runs TypeScript directly for the dev server.

- [ ] **Step 2: Create the proxy server skeleton**

Create `server/gemini-live-proxy.ts`:

```typescript
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PROXY_PORT) || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SYSTEM_PROMPT = `You are a friendly, patient legal document assistant for DocuMentor.
The user has uploaded a legal document and wants to understand it.
Speak clearly and slowly, pausing between sentences.
Use plain language — avoid legal jargon.
If the user is a non-native English speaker, be extra clear.
Keep answers concise but thorough.`;

const wss = new WebSocketServer({ port: PORT });
console.log(`Gemini Live proxy listening on ws://localhost:${PORT}`);

wss.on("connection", (client: WebSocket) => {
  console.log("Client connected");
  let gemini: WebSocket | null = null;

  client.on("message", async (raw: Buffer) => {
    const msg = JSON.parse(raw.toString());

    // First message from client must be init with documentId
    if (msg.type === "init" && !gemini) {
      const documentId = msg.documentId;
      console.log(`Init for document: ${documentId}`);

      // Fetch document text from Supabase
      const { data: doc, error } = await supabase
        .from("documents")
        .select("raw_text")
        .eq("id", documentId)
        .single();

      if (error || !doc) {
        client.send(JSON.stringify({ error: "Document not found" }));
        client.close();
        return;
      }

      const docText = doc.raw_text?.slice(0, 8000) ?? "";

      // Open Gemini Live WebSocket
      gemini = new WebSocket(GEMINI_WS_URL);

      gemini.on("open", () => {
        // Send config as first message
        const config = {
          config: {
            model: "models/gemini-3.0-flash-live-preview",
            responseModalities: ["AUDIO"],
            systemInstruction: {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nDocument content:\n${docText}`,
                },
              ],
            },
          },
        };
        gemini!.send(JSON.stringify(config));
        console.log("Gemini session configured");

        // Tell the client the session is ready
        client.send(JSON.stringify({ type: "ready" }));
      });

      // Relay Gemini → Client
      gemini.on("message", (data: Buffer) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      });

      gemini.on("close", () => {
        console.log("Gemini session closed");
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });

      gemini.on("error", (err) => {
        console.error("Gemini WS error:", err.message);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ error: "Gemini connection failed" }));
          client.close();
        }
      });

      return;
    }

    // All other messages: relay Client → Gemini
    if (gemini && gemini.readyState === WebSocket.OPEN) {
      gemini.send(raw.toString());
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    if (gemini && gemini.readyState === WebSocket.OPEN) {
      gemini.close();
    }
  });
});
```

- [ ] **Step 3: Add a dev script for the proxy**

Add to `package.json` scripts:

```json
"dev:proxy": "tsx server/gemini-live-proxy.ts"
```

- [ ] **Step 4: Test the proxy starts**

```bash
npx tsx server/gemini-live-proxy.ts
```

Expected: `Gemini Live proxy listening on ws://localhost:3001`

Kill it with Ctrl+C.

- [ ] **Step 5: Test with a WebSocket client**

In a separate terminal, start the proxy. Then test with a quick Node script or browser console:

```javascript
// In browser console (with Next.js dev server running for Supabase access):
const ws = new WebSocket("ws://localhost:3001");
ws.onmessage = (e) => console.log("Received:", JSON.parse(e.data));
ws.onopen = () => {
  // Replace with a real document ID from your Supabase
  ws.send(JSON.stringify({ type: "init", documentId: "YOUR_DOC_ID" }));
};
// Expected: { type: "ready" } message after Gemini session opens
// Then send a text message:
// ws.send(JSON.stringify({ realtimeInput: { text: "What is this document about?" } }));
// Expected: serverContent messages with audio and/or transcription
```

- [ ] **Step 6: Commit**

```bash
git add server/gemini-live-proxy.ts package.json package-lock.json
git commit -m "feat: add Gemini Live WebSocket proxy server"
```

---

## Task 2: Client-side audio worklet for 16kHz downsampling

**Files:**
- Create: `public/pcm-worklet.js`

The AudioWorklet runs in the browser's audio thread. It receives mic input (typically 44.1kHz or 48kHz), downsamples to 16kHz mono, and posts PCM chunks to the main thread. This file must live in `public/` so the browser can load it by URL.

- [ ] **Step 1: Create the AudioWorklet processor**

Create `public/pcm-worklet.js`:

```javascript
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    // We'll accumulate samples and send chunks of ~4096 samples at 16kHz (~256ms)
    this._chunkSize = 4096;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputData = input[0]; // Float32, mono channel, at sampleRate (44100 or 48000)
    const ratio = sampleRate / 16000;

    // Simple linear downsampling to 16kHz
    for (let i = 0; i < inputData.length; i += ratio) {
      const idx = Math.floor(i);
      if (idx < inputData.length) {
        this._buffer.push(inputData[idx]);
      }
    }

    if (this._buffer.length >= this._chunkSize) {
      // Convert float32 [-1, 1] to int16 PCM
      const pcm = new Int16Array(this._buffer.length);
      for (let i = 0; i < this._buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, this._buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage({ pcm: pcm.buffer }, [pcm.buffer]);
      this._buffer = [];
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
```

- [ ] **Step 2: Commit**

```bash
git add public/pcm-worklet.js
git commit -m "feat: add AudioWorklet for 16kHz PCM downsampling"
```

---

## Task 3: Client-side GeminiLiveClient class

**Files:**
- Create: `lib/gemini-live.ts`

This is the main client library. It manages the WebSocket connection to the proxy, mic capture, audio playback, and voice state. Uses an event-based pattern so the UI can subscribe to state changes and transcripts.

- [ ] **Step 1: Create the GeminiLiveClient**

Create `lib/gemini-live.ts`:

```typescript
export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

type EventMap = {
  stateChange: VoiceState;
  transcript: { role: "user" | "model"; text: string };
  error: string;
};

type Listener<K extends keyof EventMap> = (data: EventMap[K]) => void;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private state: VoiceState = "idle";
  private listeners: { [K in keyof EventMap]?: Listener<K>[] } = {};

  // Audio playback queue
  private playbackQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  on<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<K>[]).push(fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (arr) this.listeners[event] = arr.filter((f) => f !== fn) as any;
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    arr?.forEach((fn) => fn(data));
  }

  private setState(s: VoiceState) {
    this.state = s;
    this.emit("stateChange", s);
  }

  getState() {
    return this.state;
  }

  async connect(documentId: string) {
    if (this.state !== "idle") return;
    this.setState("connecting");

    try {
      // Set up audio context and worklet
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      await this.audioContext.audioWorklet.addModule("/pcm-worklet.js");

      // Get mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

      // When worklet sends a PCM chunk, forward it to proxy
      this.workletNode.port.onmessage = (e: MessageEvent) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.state === "listening") {
          const pcmBuffer: ArrayBuffer = e.data.pcm;
          const base64 = arrayBufferToBase64(pcmBuffer);
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  data: base64,
                  mimeType: "audio/pcm;rate=16000",
                },
              },
            })
          );
        }
      };

      source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination); // needed to keep the worklet alive

      // Open WebSocket to proxy
      const proxyUrl = `ws://localhost:${process.env.NEXT_PUBLIC_PROXY_PORT || 3001}`;
      this.ws = new WebSocket(proxyUrl);

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ type: "init", documentId }));
      };

      this.ws.onmessage = (e: MessageEvent) => {
        const msg = JSON.parse(e.data);
        this.handleServerMessage(msg);
      };

      this.ws.onerror = () => {
        this.emit("error", "WebSocket connection failed");
        this.disconnect();
      };

      this.ws.onclose = () => {
        if (this.state !== "idle") {
          this.disconnect();
        }
      };
    } catch (err: any) {
      this.emit("error", err?.message ?? "Failed to connect");
      this.disconnect();
    }
  }

  private handleServerMessage(msg: any) {
    // Proxy ready signal
    if (msg.type === "ready") {
      this.setState("listening");
      return;
    }

    // Error from proxy
    if (msg.error) {
      this.emit("error", msg.error);
      this.disconnect();
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    // Audio data from model
    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.setState("speaking");
          this.queueAudio(part.inlineData.data);
        }
      }
    }

    // Transcription of user input
    if (sc.inputTranscription?.text) {
      this.emit("transcript", { role: "user", text: sc.inputTranscription.text });
    }

    // Transcription of model output
    if (sc.outputTranscription?.text) {
      this.emit("transcript", { role: "model", text: sc.outputTranscription.text });
    }

    // Model turn complete
    if (sc.turnComplete) {
      // After playback finishes, go back to listening
      if (!this.isPlaying) {
        this.setState("listening");
      }
      // Otherwise, playNextBuffer will set state to listening when queue empties
    }

    // Model was interrupted
    if (sc.interrupted) {
      this.playbackQueue = [];
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      this.isPlaying = false;
      this.setState("listening");
    }
  }

  private queueAudio(base64Pcm: string) {
    if (!this.audioContext) return;

    const raw = base64ToArrayBuffer(base64Pcm);
    const int16 = new Int16Array(raw);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 16000);
    buffer.copyToChannel(float32, 0);
    this.playbackQueue.push(buffer);

    if (!this.isPlaying) {
      this.playNextBuffer();
    }
  }

  private playNextBuffer() {
    if (!this.audioContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      // If model is done, go back to listening
      if (this.state === "speaking") {
        this.setState("listening");
      }
      return;
    }

    this.isPlaying = true;
    const buffer = this.playbackQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.onended = () => {
      this.currentSource = null;
      this.playNextBuffer();
    };
    this.currentSource = source;
    source.start();
  }

  disconnect() {
    // Stop mic
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    // Disconnect worklet
    this.workletNode?.disconnect();
    this.workletNode = null;

    // Close audio context
    this.audioContext?.close();
    this.audioContext = null;

    // Stop playback
    this.playbackQueue = [];
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;

    // Close WebSocket
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    this.ws = null;

    this.setState("idle");
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ realtimeInput: { text } }));
    }
  }
}

// ── Helpers ──

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

- [ ] **Step 2: Test in browser console**

With both servers running (`npm run dev` + `npm run dev:proxy`), open a document page, then in the browser console:

```javascript
import("/lib/gemini-live.js") // won't work directly, but you can test via:
// Temporarily add to document page: window.__glc = new GeminiLiveClient();
// Then in console:
// __glc.on("stateChange", s => console.log("State:", s));
// __glc.on("transcript", t => console.log("Transcript:", t));
// __glc.on("error", e => console.log("Error:", e));
// __glc.connect("YOUR_DOC_ID");
// Allow mic permission when prompted
// Speak — you should hear a voice response and see transcript logs
```

- [ ] **Step 3: Commit**

```bash
git add lib/gemini-live.ts
git commit -m "feat: add GeminiLiveClient for voice capture, playback, and proxy communication"
```

---

## Task 4: Add mic button and voice UI to document page

**Files:**
- Modify: `app/(app)/document/[id]/page.tsx`

Add a mic toggle button to the "Ask AI" input bar. Show voice state visually. Display transcripts as chat messages.

- [ ] **Step 1: Add imports and voice state hooks**

At the top of `document/[id]/page.tsx`, add after existing imports:

```typescript
import { GeminiLiveClient, VoiceState } from "@/lib/gemini-live";
```

Inside the `DocumentPage` component, add after the existing `asking` state:

```typescript
const [voiceState, setVoiceState] = useState<VoiceState>("idle");
const clientRef = useRef<GeminiLiveClient | null>(null);

// Initialize GeminiLiveClient once
useEffect(() => {
  const client = new GeminiLiveClient();
  clientRef.current = client;

  client.on("stateChange", setVoiceState);
  client.on("transcript", (t) => {
    setMessages((prev) => {
      // Append to last message of same role, or create new
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
  });

  return () => {
    client.disconnect();
  };
}, []);
```

- [ ] **Step 2: Add the mic button to the "Ask AI" input bar**

In the `{view === "ask" && (...)}` section, find the input bar `<div>` (the one with `borderTop`). Replace the input bar div with:

```tsx
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
      animation: voiceState === "listening" ? "pulse 1.5s ease-in-out infinite" : "none",
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

  {/* Existing text input */}
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
```

- [ ] **Step 3: Add pulse animation to globals.css**

Append to `app/globals.css`:

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}
```

- [ ] **Step 4: Test end-to-end**

1. Start both servers: `npm run dev` and `npm run dev:proxy`
2. Navigate to a document page, select "Ask AI" from the dropdown
3. Click the mic button — should see "Connecting..." then "Listening..."
4. Speak a question — should hear Gemini respond and see transcript in chat
5. Click stop (square icon) to end the session
6. Text input should still work independently

- [ ] **Step 5: Commit**

```bash
git add app/(app)/document/[id]/page.tsx app/globals.css
git commit -m "feat: add mic button and voice UI to document Ask AI panel"
```

---

## Task 5: Polish — error handling and cleanup

**Files:**
- Modify: `lib/gemini-live.ts`
- Modify: `app/(app)/document/[id]/page.tsx`

- [ ] **Step 1: Add error display in the UI**

In `document/[id]/page.tsx`, add an `error` state and wire it to the client:

```typescript
const [voiceError, setVoiceError] = useState<string | null>(null);
```

In the `useEffect` that initializes the client, update the error handler:

```typescript
client.on("error", (err) => {
  setVoiceError(err);
  setTimeout(() => setVoiceError(null), 5000);
});
```

Add an error banner inside the "Ask AI" view, above the input bar:

```tsx
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
```

- [ ] **Step 2: Handle mic permission denied in GeminiLiveClient**

In `lib/gemini-live.ts`, in the `connect()` method's catch block, improve the error message:

```typescript
} catch (err: any) {
  const message =
    err?.name === "NotAllowedError"
      ? "Microphone access denied. Please allow mic access and try again."
      : err?.message ?? "Failed to connect";
  this.emit("error", message);
  this.disconnect();
}
```

- [ ] **Step 3: Cleanup on page navigation**

The existing `useEffect` cleanup (`return () => { client.disconnect(); }`) already handles this. Verify it works by navigating away from a document page while a voice session is active — the mic should stop and WebSocket should close.

- [ ] **Step 4: Commit**

```bash
git add lib/gemini-live.ts app/(app)/document/[id]/page.tsx
git commit -m "feat: add voice error handling and cleanup"
```
