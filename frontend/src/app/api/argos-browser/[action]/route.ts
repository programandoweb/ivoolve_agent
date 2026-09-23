import { NextRequest, NextResponse } from 'next/server';
import { authenticatedBackendFetch } from '@/lib/backend';

const endpoints: Record<string, { path: string; method: string }> = {
  pending: { path: 'pending', method: 'GET' },
  devices: { path: 'devices', method: 'GET' },
  approve: { path: 'approve', method: 'POST' },
};
async function handle(request: NextRequest, action: string, method: string) {
  const route = endpoints[action];
  if (!route || route.method !== method) return NextResponse.json({ message: 'Ruta no permitida' }, { status: 404 });
  try {
    const response = await authenticatedBackendFetch('/admin/argos-browser/' + route.path, {
      method,
      ...(method === 'POST' ? { body: await request.text() } : {}),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'No fue posible consultar el emparejamiento.' }, { status: 503 });
  }
}
export async function GET(request: NextRequest, { params }: { params: { action: string } }) {
  return handle(request, params.action, 'GET');
}
export async function POST(request: NextRequest, { params }: { params: { action: string } }) {
  return handle(request, params.action, 'POST');
}
