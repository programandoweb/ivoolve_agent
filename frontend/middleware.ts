import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("ivoolve_session")?.value);

  // Esta comprobación rápida evita abrir el dashboard sin cookie.
  // La validez criptográfica real del JWT se verifica luego contra NestJS.
  if (request.nextUrl.pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
