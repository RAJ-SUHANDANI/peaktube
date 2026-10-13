import { NextResponse } from "next/server";
import { providerDiagnostics } from "@/lib/providers";
export const runtime="nodejs";
export async function GET(){
 return NextResponse.json({status:"ok",videoProvider:providerDiagnostics(),timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
