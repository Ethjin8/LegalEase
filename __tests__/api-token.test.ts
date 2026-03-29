// __tests__/api-token.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock @google/genai SDK
const mockAuthTokensCreate = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    authTokens = { create: mockAuthTokensCreate };
  },
}));

// Set env vars
vi.stubEnv("GEMINI_API_KEY", "test-api-key");

import { POST } from "@/app/api/token/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when documentId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/documentId/i);
  });

  it("returns 404 when document is not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const res = await POST(makeRequest({ documentId: "missing-id" }));
    expect(res.status).toBe(404);
  });

  it("returns token and config on success", async () => {
    mockSingle.mockResolvedValue({
      data: { raw_text: "This is a lease agreement..." },
      error: null,
    });
    mockAuthTokensCreate.mockResolvedValue({ name: "ephemeral-token-abc" });

    const res = await POST(makeRequest({
      documentId: "doc-123",
      language: "Spanish (US & Mexico)",
      readingLevel: 1,
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("ephemeral-token-abc");
    expect(json.systemPrompt).toContain("legal document assistant");
    expect(json.systemPrompt).toContain("This is a lease agreement");
    expect(json.systemPrompt).toContain("Spanish (US & Mexico)");
    expect(json.languageCode).toBe("es-US");
    expect(json.voiceName).toBe("Puck");

    // Verify SDK was called with correct config
    expect(mockAuthTokensCreate).toHaveBeenCalledWith({
      config: expect.objectContaining({
        uses: 1,
        httpOptions: { apiVersion: "v1alpha" },
      }),
    });
  });

  it("returns 500 when token creation fails", async () => {
    mockSingle.mockResolvedValue({
      data: { raw_text: "Some doc text" },
      error: null,
    });
    mockAuthTokensCreate.mockRejectedValue(new Error("API error"));

    const res = await POST(makeRequest({ documentId: "doc-123" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/token/i);
  });
});
