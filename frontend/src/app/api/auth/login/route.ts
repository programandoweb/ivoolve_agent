import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await backendFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const result = NextResponse.json({ user: data.user });

    result.cookies.set("ivoolve_session", data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...(process.env.SESSION_COOKIE_DOMAIN
        ? { domain: process.env.SESSION_COOKIE_DOMAIN }
        : {}),
      maxAge: 60 * 60 * 8
    });

    return result;
  } catch {
    return NextResponse.json(
      { message: "No fue posible conectar con el backend." },
      { status: 503 }
    );
  }
}
