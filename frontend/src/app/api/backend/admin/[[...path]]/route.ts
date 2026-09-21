import { NextRequest, NextResponse } from "next/server";
import { authenticatedBackendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

async function proxy(
  request: NextRequest,
  context: { params: { path?: string[] } }
) {
  const suffix = context.params.path?.join("/") ?? "";
  const target = `/admin${suffix ? `/${suffix}` : ""}`;
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.text() : undefined;

  try {
    const response = await authenticatedBackendFetch(target, {
      method: request.method,
      ...(body ? { body } : {})
    });
    const text = await response.text();

    return new NextResponse(text || "{}", {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return NextResponse.json(
      { message: "Backend administrativo no disponible." },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
