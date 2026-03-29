// lib/gemini-live.ts
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

  // Audio playback — schedule contiguously to avoid gaps
  private playbackQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private currentSource: AudioBufferSourceNode | null = null;
  private turnComplete = false;
  private micAnalyser: AnalyserNode | null = null;
  private playbackAnalyser: AnalyserNode | null = null;

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

  getMicAnalyser(): AnalyserNode | null {
    return this.micAnalyser;
  }

  getPlaybackAnalyser(): AnalyserNode | null {
    return this.playbackAnalyser;
  }

  async connect(documentId: string, language?: string, readingLevel?: number) {
    if (this.state !== "idle") return;
    this.setState("connecting");

    try {
      // 1. Fetch ephemeral token and config from our API
      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, language, readingLevel }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({ error: "Failed to get token" }));
        throw new Error(err.error || "Failed to get token");
      }

      const { token, systemPrompt, languageCode, voiceName } = await tokenRes.json();

      // 2. Set up audio context and worklet
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      await this.audioContext.audioWorklet.addModule("/pcm-worklet.js");

      // 3. Get mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;
      source.connect(this.micAnalyser);

      this.playbackAnalyser = this.audioContext.createAnalyser();
      this.playbackAnalyser.fftSize = 256;

      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

      // When worklet sends a PCM chunk, forward it directly to Gemini
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
      // Connect worklet to destination via silent gain node to keep it alive without audio feedback
      const silencer = this.audioContext.createGain();
      silencer.gain.value = 0;
      this.workletNode.connect(silencer);
      silencer.connect(this.audioContext.destination);

      // 4. Open WebSocket directly to Gemini using ephemeral token
      const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      this.ws = new WebSocket(geminiUrl);

      this.ws.onopen = () => {
        // Send setup message with model config and system prompt
        const setupMessage = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName,
                  },
                },
                languageCode: languageCode,
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        };
        this.ws!.send(JSON.stringify(setupMessage));
      };

      this.ws.onmessage = async (e: MessageEvent) => {
        try {
          const text = e.data instanceof Blob ? await e.data.text() : e.data;
          const msg = JSON.parse(text);
          this.handleServerMessage(msg);
        } catch {
          this.emit("error", "Received invalid message from server");
        }
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
      const message =
        err?.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : err?.message ?? "Failed to connect";
      this.emit("error", message);
      this.disconnect();
    }
  }

  private handleServerMessage(msg: any) {
    // Gemini setup acknowledgment — now ready to stream
    if (msg.setupComplete !== undefined) {
      this.setState("listening");
      return;
    }

    // Error from Gemini
    if (msg.error) {
      this.emit("error", msg.error.message || "Gemini error");
      this.disconnect();
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    // Audio data from model
    if (sc.modelTurn?.parts) {
      if (this.state !== "speaking") {
        this.turnComplete = false;
      }
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
      this.turnComplete = true;
      if (!this.isPlaying) {
        this.setState("listening");
      }
    }

    // Model was interrupted
    if (sc.interrupted) {
      this.playbackQueue = [];
      this.nextPlayTime = 0;
      this.turnComplete = false;
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

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    this.scheduleBuffer(buffer);
  }

  private scheduleBuffer(buffer: AudioBuffer) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // If nothing is scheduled or we've fallen behind, start from now with a small buffer
    if (this.nextPlayTime <= now) {
      this.nextPlayTime = now + 0.02; // 20ms buffer to avoid underrun
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackAnalyser!);
    this.playbackAnalyser!.connect(this.audioContext.destination);

    const endTime = this.nextPlayTime + buffer.duration;

    source.onended = () => {
      // Only the last buffer in the chain should trigger the transition
      if (this.currentSource !== source) return;
      this.currentSource = null;
      this.isPlaying = false;

      // If model turn is already complete, go back to listening
      if (this.turnComplete) {
        this.turnComplete = false;
        if (this.state === "speaking") {
          this.setState("listening");
        }
      }
    };

    source.start(this.nextPlayTime);
    this.nextPlayTime = endTime;
    this.currentSource = source;
    this.isPlaying = true;
  }

  disconnect() {
    // Stop mic
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    // Disconnect worklet
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.micAnalyser = null;
    this.playbackAnalyser = null;

    // Close audio context
    this.audioContext?.close();
    this.audioContext = null;

    // Stop playback
    this.playbackQueue = [];
    this.nextPlayTime = 0;
    this.turnComplete = false;
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

// -- Helpers --

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
