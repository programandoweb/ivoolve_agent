import { NextRequest, NextResponse } from 'next/server';
import { authenticatedBackendFetch } from '@/lib/backend';

export const dynamic = 'force-dynamic';
type Params = { params: { path?: string[] } };
async function proxy(request: NextRequest, { params }: Params) {
  const parts = params.path || [];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowed =
    (request.method === 'GET' && parts.length === 0) ||
    (request.method === 'POST' && (parts.length === 0 || (parts.length === 2 && uuid.test(parts[0]) && parts[1] === 'prepare') || (parts.length === 2 && parts[0].startsWith('builtin-') && /^[a-z-]+$/.test(parts[0]) && parts[1] === 'prepare'))) ||
    (['PATCH', 'DELETE'].includes(request.method) && parts.length === 1 && uuid.test(parts[0]));
  if (!allowed) return NextResponse.json({ message: 'Ruta no permitida.' }, { status: 404 });
  try {
    const response = await authenticatedBackendFetch('/argos/templates' + (parts.length ? '/' + parts.join('/') : ''), {
      method: request.method,
      ...(['POST', 'PATCH'].includes(request.method) ? { body: await request.text() } : {}),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'Servicio de plantillas no disponible.' }, { status: 503 });
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
