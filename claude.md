**LegalEase**

An AI-powered legal document assistant that removes bureaucratic barriers for immigrants by making complex legal paperwork understandable through conversational AI and real-time research.

---

**Stack:** TypeScript / Next.js, Supabase (auth + database), Gemini Live API (voice/TTS)

**Color Theme & Font:** Clean, minimal white background. Source Sans Pro for UI text, Merriweather for document content. Prioritize legibility and a calm, approachable feel.

---

**Core Workflow:**

1. **Document Upload**
   - User uploads a legal document (PDF, image, or text)
   - OCR + AI parsing extracts document content
   - Supabase stores document metadata and parsed text

2. **FAQ Generation**
   - On upload, AI immediately generates a plain-language FAQ about the document
   - Surfaces key clauses, obligations, deadlines, and what the user is agreeing to
   - FAQ displayed before any interaction begins

3. **Conversational Q&A (Gemini Live)**
   - Talk button at the bottom of the screen activates Gemini Live API
   - User can ask questions about the document by voice or text
   - TTS responds in plain language at an optimized, comfortable speaking rate
   - Conversation is real-time and responsive

4. **Deep Research (Parallel)**
   - While the user converses, a background research agent runs in parallel
   - Looks up relevant legal definitions, precedents, and resources
   - Results surface contextually during or after the conversation

5. **Resource Access**
   - Links to legal aid organizations, translation services, and relevant government resources
   - Localized where possible based on document context

---

**Design Principles:**

- **Ease first:** Every interaction should reduce anxiety, not add to it
- **Language accessibility:** UI and AI responses must work well for non-native English speakers; avoid jargon
- **Responsive and real-time:** No waiting — FAQ appears immediately, voice response is instant
- **Optimized TTS rate:** Speech should be slower and clearer than default, calibrated for comprehension

---

**Supported Document Types:**

| Category | Examples |
|----------|---------|
| Rental / Housing | Lease agreements, eviction notices, housing voucher terms |
| Employment | Job contracts, NDAs, non-compete clauses |
| Immigration | Visa applications, asylum paperwork, I-9, USCIS notices |
| Financial | Loan agreements, debt collection notices, credit disclosures |
| Government Benefits | Benefit eligibility forms, appeal letters |
| General Legal | Court summons, consent forms, settlement agreements |

---

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
