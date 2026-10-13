import { NextRequest, NextResponse } from "next/server";
import { lookupChannel } from "@/lib/providers";
export async function GET(request:NextRequest){
 const id=(request.nextUrl.searchParams.get("id")||"").slice(0,120);
 if(!/^UC[A-Za-z0-9_-]{20,26}$/.test(id)&&!/^@[A-Za-z0-9._-]{1,60}$/.test(id))
   return NextResponse.json({error:"Invalid channel ID"},{status:400});
 const channel=await lookupChannel(id);
 return NextResponse.json({channel},{headers:{"Cache-Control":channel?"public, s-maxage=180":"no-store"}});
}
