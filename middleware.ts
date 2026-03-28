import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = ["/workspace", "/document", "/preferences"];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuth = user !== null;
  const isLanding = pathname === "/";
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isAuth && isLanding) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (!isAuth && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response();
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/document/:path*", "/preferences/:path*"],
};
