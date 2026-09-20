import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await backendFetch("/agents/chat", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message: "No fue posible comunicarse con el backend."
      },
      { status: 503 }
    );
  }
}
