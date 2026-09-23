import { NextRequest, NextResponse } from 'next/server';
import { authenticatedBackendFetch } from '@/lib/backend';

export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = params.path || [];
  // Strict allowlist prevents arbitrary backend routing through the proxy.
  const allowed = request.method === 'GET' && path.length === 0
    || request.method === 'POST' && (path.length === 1 && path[0] === 'retry-pending'
      || path.length === 2 && /^[a-f\d-]{36}$/i.test(path[0]) && path[1] === 'retry');
  if (!allowed) return NextResponse.json({ message: 'Ruta no permitida.' }, { status: 404 });
  try {
    const response = await authenticatedBackendFetch('/argos/outbox/' + path.join('/'), {
      method: request.method,
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'No es posible consultar el outbox de Argos.' }, { status: 503 });
  }
}
export const GET = proxy;
export const POST = proxy;
