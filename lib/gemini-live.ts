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
