import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await backendFetch("/health");
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        service: "ivoolve-agent-orchestrator",
        redis: "unknown"
      },
      { status: 503 }
    );
  }
}
