# LegalEase

An AI-powered legal document assistant that makes complex legal paperwork understandable through plain-language explanations, conversational voice AI, and real-time legal research.

Upload a document. Get an instant FAQ. Talk to it. Get connected to resources that can help.

---

## Features

- **Instant FAQ Generation** — Upload a PDF, image, or text file and get a plain-language summary, key dates, obligations, and Q&A within seconds
- **Voice Conversations** — Talk to your document using Gemini Live with real-time voice input and text-to-speech responses
- **Text Chat** — Ask follow-up questions via text with full conversation history
- **Deep Research** — Background AI research automatically surfaces relevant legal definitions, resources, and aid organizations
- **50+ Languages** — Full multilingual support for UI, voice, and AI responses
- **Reading Level Adaptation** — Responses adjust from simple (no jargon) to detailed (legal context included)
- **OCR Support** — Extract text from scanned PDFs and images via Tesseract.js

### Supported Document Types

| Category | Examples |
|----------|---------|
| Rental / Housing | Lease agreements, eviction notices, housing voucher terms |
| Employment | Job contracts, NDAs, non-compete clauses |
| Immigration | Visa applications, asylum paperwork, USCIS notices |
| Financial | Loan agreements, debt collection notices, credit disclosures |
| Government Benefits | Eligibility forms, appeal letters |
| General Legal | Court summons, consent forms, settlement agreements |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI | Google Gemini 2.5 Flash (text), Gemini Live (voice) |
| Text Extraction | pdf-parse, Tesseract.js |
| Voice | WebSocket proxy to Gemini Live API, Web Audio API |
| Deployment | Railway (Nixpacks) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### Setup

```bash
git clone https://github.com/Ethjin8/LegalEase.git
cd LegalEase
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

Run the database schema in your Supabase SQL Editor:

```sql
-- Copy and run the contents of supabase/schema.sql
```

### Run

```bash
# Terminal 1 — Next.js app (port 3000)
npm run dev

# Terminal 2 — Gemini Live voice proxy (port 3001)
npm run dev:proxy
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
Client (Browser)
├── Landing Page         ← Animated intro, auth modal, language/region/reading level setup
├── Workspace            ← Sidebar with document list, search, upload
└── Document View        ← Three tabs: Overview (FAQ), Ask AI (voice/text), Full Text
      │
      ├── FAQ Panel      ← Summary, key dates, obligations, expandable Q&A
      ├── Voice Chat     ← Gemini Live via WebSocket proxy
      ├── Text Chat      ← REST API with conversation history
      └── Research Panel ← Auto-inferred legal topic research

API Routes
├── /api/upload          ← File upload → OCR → FAQ generation → Supabase insert
├── /api/chat            ← Text Q&A with language/reading level/region context
└── /api/research        ← Deep research on inferred legal topics

Voice Pipeline
Browser ←WebSocket→ gemini-live-proxy (port 3001) ←WebSocket→ Gemini Live API
         (PCM audio at 16kHz, bidirectional streaming)
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User preferences (language, region, reading level) |
| `documents` | File metadata, raw extracted text |
| `faqs` | Generated summaries, Q&A items, key dates, obligations |
| `chat_messages` | Conversation history per document |
| `research_results` | AI research findings with sources |

---

## Project Structure

```
app/
  page.tsx                    Landing page
  layout.tsx                  Root layout
  api/
    upload/route.ts           OCR → FAQ generation → DB insert
    chat/route.ts             Text Q&A endpoint
    research/route.ts         Deep legal research endpoint
components/
  AuthModal.tsx               Login/signup with language, region, reading level
  Sidebar.tsx                 Document list, search, upload, settings
  DocumentDetailView.tsx      Main document view (FAQ / Ask AI / Full Text tabs)
  DocumentUpload.tsx          Drag-and-drop file upload
  FAQPanel.tsx                FAQ accordion with summary, dates, obligations
  VoiceChat.tsx               Voice + text chat interface
  MicOverlay.tsx              Mic button with state animations
  ResearchPanel.tsx           Auto-research findings and resource links
  MascotAnimation.tsx         Landing page character animation
lib/
  gemini.ts                   AI functions (generateFAQ, answerQuestion, runDeepResearch)
  gemini-live.ts              Gemini Live WebSocket client (voice)
  ocr.ts                      PDF and image text extraction
  supabase/                   Browser + server Supabase clients
server/
  gemini-live-proxy.ts        WebSocket proxy between browser and Gemini Live API
supabase/
  schema.sql                  Database tables, RLS policies, storage bucket
public/
  pcm-worklet.js              Audio worklet for real-time mic processing
  animation/                  Mascot sprite frames
```

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `PROXY_PORT` | Voice proxy port (default: `3001`) |
| `NEXT_PUBLIC_PROXY_PORT` | Client-side proxy port reference (default: `3001`) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:proxy` | Start Gemini Live voice proxy |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run start:proxy` | Start voice proxy (production) |
| `npm run lint` | Run ESLint |
