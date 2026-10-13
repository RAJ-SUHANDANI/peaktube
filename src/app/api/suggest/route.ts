import { NextRequest, NextResponse } from "next/server";
import { lookupSuggestions } from "@/lib/providers";
export async function GET(request:NextRequest){
 const q=(request.nextUrl.searchParams.get("q")||"").slice(0,90).trim();
 if(q.length<2)return NextResponse.json({suggestions:[]});
 const suggestions=await lookupSuggestions(q);
 return NextResponse.json({suggestions},{headers:{"Cache-Control":"public, s-maxage=60"}});
}
