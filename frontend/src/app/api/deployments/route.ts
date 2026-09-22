import { NextRequest, NextResponse } from "next/server";
import { authenticatedBackendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  try {
    const response = await authenticatedBackendFetch("/auth/me");
    if (!response.ok) return NextResponse.json({ error: "Sesión requerida" }, { status: response.status });
    const data = (await response.json()) as { user?: { role?: string } };
    if (data.user?.role !== "admin") {
      return NextResponse.json({ error: "Operación no autorizada" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: "No fue posible validar la sesión" }, { status: 503 });
  }
}

function sameOrigin(req: NextRequest): boolean {
  const expected = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return req.headers.get("origin") === expected;
}

async function controlRequest(path: string, method: "GET" | "POST") {
  const baseUrl = process.env.DEPLOY_CONTROL_URL || "http://host.docker.internal:8766";
  const token = process.env.DEPLOY_CONTROL_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "DEPLOY_CONTROL_TOKEN no está configurado. Ejecuta una vez bash deploy.sh desde consola." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(baseUrl.replace(/\/+$/, "") + path, {
      method,
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json(
      { error: "Control de despliegue no disponible. Ejecuta una vez bash deploy.sh desde consola para instalarlo." },
      { status: 503 }
    );
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return controlRequest("/status", "GET");
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const denied = await requireAdmin();
  if (denied) return denied;
  return controlRequest("/deploy", "POST");
}
