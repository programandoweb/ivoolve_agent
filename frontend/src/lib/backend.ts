import { cookies } from "next/headers";

const DEFAULT_BACKEND_URL = "http://localhost:5020";

export function getBackendUrl(): string {
  return (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

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

export async function authenticatedBackendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = cookies().get("ivoolve_session")?.value;

  return backendFetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}
