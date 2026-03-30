# Citation System Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add inline citations to AI-generated content (FAQ and Chat) so users can see exactly which parts of their uploaded document each answer references. Citations appear as clickable superscript numbers. Clicking shows a popover with the quoted excerpt and a "View in document" link that navigates to the Full Text tab with the passage highlighted.

## Scope

**In scope:**
- FAQ Panel citations (summary, items, key dates, obligations)
- Chat (Ask AI) citations
- Citation popover with quoted excerpt
- "View in document" navigation to Full Text tab with highlight

**Out of scope:**
- Research Panel (dead feature, not in use)
- Voice/audio responses
- Retroactive citations on existing data

## Approach: Prompt-Based Citations

Modify Gemini prompts to return structured JSON containing both the answer text (with superscript markers) and a citations array mapping each marker to a verbatim excerpt from the document.

**Why this approach:** No new infrastructure, no pre-processing on upload, no migration for existing documents. The AI naturally knows which parts of the document it's drawing from. The tradeoff (no exact character offsets) is manageable with substring matching.

**Rejected alternatives:**
- Pre-chunked documents with IDs: requires new chunking logic, storage, and migration. Chunk boundaries may not match semantic boundaries.
- Post-hoc matching: most complex, citations are "best guesses" not what the AI actually used, extra latency.

## Data Model

### New Type: Citation

```typescript
interface Citation {
  index: number;       // 1, 2, 3...
  excerpt: string;     // verbatim quote from the document
}
```

### Modified Types

**FAQItem** — add optional citations array:
```typescript
interface FAQItem {
  question: string;
  answer: string;         // contains superscript markers: "...notice¹..."
  citations?: Citation[];
}
```

**Chat API response** — changes from `{ answer: string }` to:
```typescript
{ answer: string; citations?: Citation[] }
```

**ChatMessage** — add optional citations for model messages:
```typescript
interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
  citations?: Citation[];
}
```

### Database Changes

- `chat_messages` table: add `citations JSONB DEFAULT NULL` column
- `faqs.items` JSONB: no schema change needed — the `Citation[]` is embedded in each FAQItem within the existing JSONB column

## Prompt Engineering

### FAQ Generation (`generateFAQ`)

Update the prompt to instruct Gemini to:
- Embed superscript markers (¹, ², ³) in answer text and summary where it references the document
- Include a `citations` array in each FAQ item mapping marker numbers to verbatim excerpts
- Add a top-level `summary_citations` array for citations within the summary text
- Quote excerpts exactly as they appear in the document (critical for substring matching)

### Chat Answers (`answerQuestion`)

Update the prompt to:
- Return JSON `{ answer, citations }` instead of plain text
- Same superscript marker and verbatim excerpt convention
- Update response parsing from `response.text()` to JSON parse

### Key Prompt Constraint

Instruct Gemini to quote excerpts **verbatim** from the source document, not paraphrased. This is required for the substring matching used by "View in document."

## UI Design

### Citation Markers (inline)

- Blue superscript numbers (`color: #2563eb`)
- Dotted underline to signal clickability
- Bold weight at smaller font size (~0.7rem)
- Rendered by extending `MarkdownRenderer.tsx` to parse superscript markers

### Citation Popover (on click)

- Appears positioned near the clicked marker
- Contains:
  - "From your document" label (small, uppercase, gray)
  - Quoted excerpt in a yellow-highlighted box (`background: #fefce8`, left border `#eab308`)
  - "View in document →" link (`color: #2563eb`, underlined)
- Closes on click-outside
- New component: `CitationPopover.tsx`

### Full Text Highlight (on "View in document")

- Switches active tab to Full Text
- Finds excerpt in `raw_text` via `indexOf()` (with normalized fallback: lowercase + collapsed whitespace)
- Scrolls to the matching position
- Applies temporary yellow highlight (`background: #fef9c3`, bottom border `#eab308`)
- Highlight fades after a few seconds or persists until dismissed

### Cross-Component Communication

"View in document" action uses a custom event (consistent with existing codebase pattern) to tell `DocumentDetailView` to switch tabs and highlight. The event carries the excerpt string.

## Component Changes

| Component | Change |
|-----------|--------|
| `MarkdownRenderer.tsx` | Parse superscript citation markers, render as clickable spans |
| `CitationPopover.tsx` | **New** — popover with excerpt + "View in document" link |
| `FAQPanel.tsx` | Pass citations data to MarkdownRenderer |
| `VoiceChat.tsx` | Parse new chat response shape, pass citations to MarkdownRenderer |
| `DocumentDetailView.tsx` | Handle "View in document" event: switch tab, scroll, highlight |
| `lib/gemini.ts` | Update prompts for `generateFAQ` and `answerQuestion` |
| `types/index.ts` | Add `Citation` interface, update `FAQItem` and `ChatMessage` |
| `app/api/chat/route.ts` | Return `{ answer, citations }`, persist citations to DB |
| `supabase/schema.sql` | Add `citations` column to `chat_messages` |

## Excerpt Location Strategy

To find where a cited excerpt lives in the full document text:

1. **Primary:** `raw_text.indexOf(excerpt)` — exact substring match
2. **Fallback:** Normalize both strings (lowercase, collapse whitespace) and retry
3. This runs client-side and is instant
4. If no match found, the "View in document" link is simply not shown for that citation
