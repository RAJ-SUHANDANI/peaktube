import { NextRequest, NextResponse } from "next/server";
import { lookupVideos } from "@/lib/providers";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const p=request.nextUrl.searchParams;
  const query=(p.get("q")||"").slice(0,120).trim();
  const category=(p.get("category")||"All").slice(0,40);
  const videoId=(p.get("id")||"").slice(0,100);
  const channelId=(p.get("channelId")||"").slice(0,120);
  const relatedId=(p.get("relatedId")||"").slice(0,100);
  const cursor=(p.get("cursor")||"").slice(0,1200);
  if((videoId&&!/^[\w-]{11}$/.test(videoId))||(relatedId&&!/^[\w-]{11}$/.test(relatedId)))
    return NextResponse.json({error:"Invalid video ID"},{status:400});
  if(channelId&&!/^UC[A-Za-z0-9_-]{20,26}$/.test(channelId)&&!/^@[A-Za-z0-9._-]{1,60}$/.test(channelId))
    return NextResponse.json({error:"Invalid channel ID"},{status:400});
  const result=await lookupVideos({query,category,videoId,channelId,relatedId,cursor});
  return NextResponse.json(result,{headers:{"Cache-Control":result.source==="marketplace"?
    "public, s-maxage=60, stale-while-revalidate=60":"no-store"}});
}
