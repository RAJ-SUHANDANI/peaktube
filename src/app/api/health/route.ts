import { NextResponse } from "next/server";
import { providerNames } from "@/lib/providers";
export async function GET() {
  return NextResponse.json({ status: "ok", configuredProviders: providerNames().length, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } });
}
