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
