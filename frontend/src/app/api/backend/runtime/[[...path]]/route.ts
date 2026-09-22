import { NextRequest, NextResponse } from "next/server";
import { authenticatedBackendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

async function proxy(
  request: NextRequest,
  context: { params: { path?: string[] } }
) {
  const suffix = context.params.path?.join("/") ?? "";
  const target = `/runtime${suffix ? `/${suffix}` : ""}`;

  try {
    const response = await authenticatedBackendFetch(target, {
      method: request.method,
    });
    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { message: "Backend runtime no disponible." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const DELETE = proxy;
