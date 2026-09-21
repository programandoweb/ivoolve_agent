import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.redirect(new URL("/login?error=sso_ticket_missing", request.url));
  }

  try {
    const response = await backendFetch(
      `/integrations/ivoolveops/sso/consume?ticket=${encodeURIComponent(ticket)}`,
    );
    const data = await response.json();

    if (!response.ok || !data.accessToken || !data.agentId) {
      return NextResponse.redirect(new URL("/login?error=sso_invalid", request.url));
    }

    const result = NextResponse.redirect(
      new URL(`/dashboard/agents/${encodeURIComponent(data.agentId)}`, request.url),
    );
    result.cookies.set("ivoolve_session", data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return result;
  } catch {
    return NextResponse.redirect(new URL("/login?error=sso_unavailable", request.url));
  }
}
