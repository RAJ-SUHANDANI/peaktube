import { NextRequest, NextResponse } from "next/server";
import { lookupVideos } from "@/lib/providers";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") || "").slice(0, 120).trim();
  const category = (searchParams.get("category") || "All").slice(0, 40);
  const videoId = searchParams.get("id") || "";
  if (videoId && !/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }
  const data = await lookupVideos({query, category, videoId});
  return NextResponse.json(data, {
    headers: { "Cache-Control": data.source === "marketplace" ? "public, s-maxage=180, stale-while-revalidate=60" : "no-store" }
  });
}
