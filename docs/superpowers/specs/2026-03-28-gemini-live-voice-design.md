# Gemini Live Voice Integration — Design Spec

## Overview

Add real-time voice conversation to DocuMentor's document Q&A using the Gemini Multimodal Live API. Users click a mic button, speak a question about their document, and hear Gemini respond in clear, slow speech. Text input remains as a fallback.

## Architecture

```
Browser (mic/speaker)  ←WebSocket→  Node WS Proxy (:3001)  ←WebSocket→  Gemini Live API
```

The proxy exists solely to keep the `GEMINI_API_KEY` server-side. It is stateless per-connection: each client WebSocket maps 1:1 to a Gemini Live session.

## Files

| File | Role |
|------|------|
| `server/gemini-live-proxy.ts` | Node WebSocket server on port 3001. Relays messages between client and Gemini. Holds API key. |
| `lib/gemini-live.ts` | Client-side class. Manages WebSocket to proxy, mic capture (`getUserMedia`), audio playback (Web Audio API), voice state machine. |
| `app/(app)/document/[id]/page.tsx` | UI changes — mic button in "Ask AI" panel, voice state indicator, transcript display. |

## Protocol Details

### Gemini Live WebSocket

- **Endpoint:** `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=API_KEY`
- **Setup message** (must be first): top-level `config` object with model, system instruction, response modalities
- **Model:** `models/gemini-3.0-flash-live-preview`
- **Response modalities:** `["AUDIO"]` — audio for playback; transcripts come via separate `inputTranscription`/`outputTranscription` fields

### Audio Formats

| Direction | Format | Sample Rate | Encoding |
|-----------|--------|-------------|----------|
| Client → Gemini | PCM 16-bit LE mono | 16,000 Hz | base64 in JSON |
| Gemini → Client | PCM 16-bit LE mono | 16,000 Hz | base64 in JSON |

Browser mic typically captures at 44.1kHz or 48kHz — client must downsample to 16kHz before sending.

### Client ↔ Proxy Message Protocol

The proxy is a transparent relay. Messages between client and proxy use the same JSON format as the Gemini Live API:

**Client → Proxy (forwarded to Gemini):**
- `realtimeInput.audio` — audio chunks (`{ data, mimeType }` with base64 PCM at 16kHz)
- `realtimeInput.text` — text messages (fallback text input, e.g. `{ "realtimeInput": { "text": "..." } }`)

**Proxy → Client (forwarded from Gemini):**
- `serverContent.modelTurn.parts[].inlineData` — audio response chunks (base64 PCM at 16kHz)
- `serverContent.inputTranscription.text` — transcript of what the user said
- `serverContent.outputTranscription.text` — transcript of what the model said
- `serverContent.turnComplete` — model finished responding
- `serverContent.interrupted` — model was interrupted by user

### Proxy ↔ Gemini

Additionally, the proxy sends the `setup` message on behalf of the client when a new connection opens. The client sends a lightweight `init` message with `documentId` so the proxy can fetch document context from Supabase and build the system instruction.

**Client → Proxy (on connect):**
```json
{ "type": "init", "documentId": "uuid-here" }
```

**Proxy then sends to Gemini:**
```json
{
  "config": {
    "model": "models/gemini-3.0-flash-live-preview",
    "responseModalities": ["AUDIO"],
    "systemInstruction": {
      "parts": [{ "text": "<system prompt with document context>" }]
    }
  }
}
```

After sending the config, the connection is ready for streaming. From that point on, the proxy is a transparent relay.

## Voice State Machine

```
idle → connecting → listening → thinking → speaking → listening
                                                    ↘ idle (user stops)
```

- **idle:** mic off, no session
- **connecting:** WebSocket opening + sending config
- **listening:** mic active, streaming audio to proxy
- **thinking:** user stopped speaking (VAD detected), waiting for model response
- **speaking:** playing model audio, mic still captures (allows interruption)
- Back to **listening** after `turnComplete`, or **idle** if user clicks stop

## System Prompt

```
You are a friendly, patient legal document assistant for DocuMentor.
The user has uploaded a legal document and wants to understand it.
Speak clearly and slowly, pausing between sentences.
Use plain language — avoid legal jargon.
If the user is a non-native English speaker, be extra clear.
Keep answers concise but thorough.

Document content:
<document text inserted here>
```

## Incremental Build Order

### Increment 1: Proxy server + basic relay
- `server/gemini-live-proxy.ts` with `ws` library
- Accept client connection, receive `init` with `documentId`
- Fetch document from Supabase, build system prompt
- Open Gemini Live session, send setup, relay all subsequent messages
- Test with `wscat` or browser console

### Increment 2: Client voice library
- `lib/gemini-live.ts` — `GeminiLiveClient` class
- WebSocket connection to proxy
- Mic capture via `getUserMedia` + AudioWorklet for 16kHz downsampling
- Audio playback via Web Audio API (queue PCM chunks at 16kHz)
- Voice state management with event emitter pattern
- Test by importing in browser console

### Increment 3: UI integration
- Mic button in the "Ask AI" input bar of `document/[id]/page.tsx`
- Visual states: idle (gray mic), connecting (pulsing), listening (red/pulsing), thinking (animated), speaking (waveform or pulse)
- Voice transcripts appear as chat messages in existing message list
- Existing text input remains, works alongside voice
- Stop button to end session

### Increment 4: Polish
- Slower TTS via system instruction tuning
- Error states: mic permission denied, connection lost, session timeout (15 min limit)
- Graceful cleanup on page navigation / component unmount
- Interruption handling: if user speaks while model is talking, stop playback

## Dependencies

**New npm packages:**
- `ws` — Node WebSocket server (for the proxy)
- `@types/ws` — TypeScript types

**No new client-side packages** — uses browser-native `getUserMedia` and Web Audio API.

## Dev Server Setup

Run both servers during development:
- `next dev` on port 3000 (existing)
- `tsx server/gemini-live-proxy.ts` on port 3001 (new)

Can be combined into a single `npm run dev` script later.
