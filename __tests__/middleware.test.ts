import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

// Mock the Supabase middleware client
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  createMiddlewareClient: () => ({
    supabase: {
      auth: { getUser: mockGetUser },
    },
    response: () => new Response(null, { status: 200 }),
  }),
}));

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("routing guard middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects authenticated user from / to /workspace", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "123" } } });
    const res = await middleware(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/workspace");
  });

  it("redirects unauthenticated user from /workspace to /", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/workspace"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects unauthenticated user from /document/abc to /", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/document/abc"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects unauthenticated user from /preferences to /", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/preferences"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("allows authenticated user to access /workspace", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "123" } } });
    const res = await middleware(makeRequest("/workspace"));
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated user to access /", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(makeRequest("/"));
    expect(res.status).toBe(200);
  });
});
