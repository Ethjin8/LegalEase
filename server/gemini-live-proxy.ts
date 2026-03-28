import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PROXY_PORT) || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  process.exit(1);
}

const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SYSTEM_PROMPT = `You are a friendly, patient legal document assistant for DocuMentor.
The user has uploaded a legal document and wants to understand it.
Speak clearly at an even pace, pausing between sentences.
Use plain language — avoid legal jargon.
If the user is a non-native English speaker, be extra clear.
Keep answers concise but thorough.`;

const wss = new WebSocketServer({ port: PORT });
console.log(`Gemini Live proxy listening on ws://localhost:${PORT}`);

wss.on("connection", (client: WebSocket) => {
  console.log("Client connected");
  let gemini: WebSocket | null = null;

  client.on("message", async (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore non-JSON frames
    }

    // First message from client must be init with documentId
    if (msg.type === "init" && !gemini) {
      const documentId = msg.documentId;
      const language = msg.language;
      if (!documentId || typeof documentId !== "string") {
        client.send(JSON.stringify({ error: "Invalid documentId" }));
        client.close();
        return;
      }
      console.log(`Init for document: ${documentId}, language: ${language || "English"}`);

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
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Puck",
                  }
                }
              }
            },
            systemInstruction: {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}${language && language !== "English" ? `\nIMPORTANT: Speak and respond in ${language}.` : ""}\n\nDocument content:\n${docText}`,
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
        const text = data.toString();
        console.log("Gemini →", text.slice(0, 200));
        if (client.readyState === WebSocket.OPEN) {
          client.send(text);
        }
      });

      gemini.on("close", (code, reason) => {
        console.log(`Gemini session closed (code: ${code}, reason: ${reason?.toString()})`);
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

  client.on("error", (err) => {
    console.error("Client WS error:", err.message);
    if (gemini && gemini.readyState === WebSocket.OPEN) {
      gemini.close();
    }
  });
});
