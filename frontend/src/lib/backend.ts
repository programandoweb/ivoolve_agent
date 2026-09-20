const DEFAULT_BACKEND_URL = "http://localhost:4000";

/**
 * Esta función vive únicamente del lado servidor.
 * Centraliza cómo Next.js habla con NestJS.
 */
export function getBackendUrl(): string {
  return (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

/**
 * Evita que una llamada hacia NestJS pueda dejar colgado un Route Handler.
 */
export async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    return await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}
