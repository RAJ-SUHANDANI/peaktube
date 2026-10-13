import type { Channel, Video, VideoResponse } from "./types";
import { filterDemo } from "./demo";

type Obj=Record<string,unknown>;
const obj=(x:unknown):Obj=>x&&typeof x==="object"&&!Array.isArray(x)?x as Obj:{};
const arr=(x:unknown):unknown[]=>Array.isArray(x)?x:[];
const string=(x:unknown):string=>typeof x==="string"?x:typeof x==="number"?String(x):"";
const pick=(x:unknown,...names:string[]):unknown=>{const o=obj(x);for(const n of names)if(o[n]!=null&&o[n]!=="")return o[n];return "";};
const text=(x:unknown):string=>string(x)||string(pick(x,"text","simpleText","label","name","title","value"));
const validVideo=/^[A-Za-z0-9_-]{11}$/;
const validChannel=/^UC[A-Za-z0-9_-]{20,26}$/;
function image(x:unknown):string{
  if(typeof x==="string")return x.startsWith("https://")?x:"";
  if(Array.isArray(x)){
    const sorted=[...x].sort((a,b)=>Number(obj(b).width||0)-Number(obj(a).width||0));
    return image(sorted[0]);
  }
  return image(pick(x,"url","src","high","medium","default","thumbnails","image"));
}
function shortCount(x:unknown):string{
  const v=text(x);if(!v)return "";
  const n=Number(v);return Number.isFinite(n)&&/^\d+$/.test(v)?Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n):v;
}
function time(x:unknown):string{
  const v=text(x);
  if(/^PT/.test(v)){
    const match=v.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if(match){const h=Number(match[1]||0),m=Number(match[2]||0),s=Number(match[3]||0);
      return (h?h+":":"")+(h?String(m).padStart(2,"0"):m)+":"+String(s).padStart(2,"0");}
  }
  if(/^\d+$/.test(v)){const n=Number(v);if(n<86400&&n>0){const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
    return (h?h+":":"")+(h?String(m).padStart(2,"0"):m)+":"+String(s).padStart(2,"0");}}
  return v;
}
export function normalizeVideo(input:unknown):Video|null{
  const outer=obj(input),v=obj(outer.video||outer.videoDetails||input),sn=obj(v.snippet);
  const author=obj(v.author||v.channel),stats=obj(v.stats||v.statistics),status=obj(v.status);
  const id=text(pick(v,"videoId","id","video_id")||pick(obj(v.id),"videoId"));
  if(!validVideo.test(id))return null;
  const title=text(pick(v,"title","name")||sn.title)||"Untitled video";
  const name=text(pick(author,"title","name","channelName")||pick(v,"channelTitle","channelName","creator","author")||sn.channelTitle)||"YouTube creator";
  const thumbnails=pick(v,"thumbnails","thumbnail","thumbnailUrl")||sn.thumbnails;
  const avatar=image(pick(author,"avatar","avatars","thumbnail","thumbnails","picture","image"));
  const embeddable=pick(v,"embeddable")||status.embeddable;
  const kids=pick(v,"madeForKids")||status.madeForKids;
  return {
    id,title,channel:name,channelId:text(pick(author,"channelId","id")||pick(v,"channelId")||sn.channelId),
    channelAvatar:avatar||image(v.channelThumbnail),
    subscriberCount:shortCount(pick(author,"subscriberCount","subscriberCountText","subscribers")),
    description:text(pick(v,"description","descriptionSnippet")||sn.description),
    thumbnail:image(thumbnails)||"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",
    views:shortCount(pick(stats,"views","viewCount","viewCountText")||pick(v,"viewCount","views")),
    likeCount:shortCount(pick(stats,"likes","likeCount")||pick(v,"likeCount","likes")),
    commentCount:shortCount(pick(stats,"comments","commentCount")||pick(v,"commentCount","commentsCount")),
    publishedAt:text(pick(v,"publishedAt","uploadDate")||sn.publishedAt),
    publishedText:text(pick(v,"publishedTimeText","publishedText","publishedTime")),
    duration:time(pick(v,"lengthSeconds","duration","lengthText")||pick(v.contentDetails,"duration")),
    category:text(v.category)||"All",isShort:v.isShort===true||text(v.type)==="short"||string(v.url).includes("/shorts/"),
    embeddable:typeof embeddable==="boolean"?embeddable:null,madeForKids:typeof kids==="boolean"?kids:null
  };
}
export function normalizeChannel(input:unknown):Channel|null{
  const w=obj(input),v=obj(w.channel||input),stats=obj(v.stats||v.statistics);
  const id=text(pick(v,"channelId","id"));
  if(!validChannel.test(id)&&!id.startsWith("@"))return null;
  return {id,title:text(pick(v,"title","name","channelName"))||"YouTube channel",
    avatar:image(pick(v,"avatar","avatars","thumbnail","thumbnails","picture","image")),
    banner:image(pick(v,"banner","banners")),handle:text(pick(v,"handle","username")),
    description:text(v.description),subscribers:shortCount(pick(stats,"subscribers","subscriberCount")||pick(v,"subscriberCount","subscribers","subscriberCountText")),
    videos:shortCount(pick(stats,"videoCount","videos")||v.videoCount)};
}
export function normalizeResults(payload:unknown):{videos:Video[];channels:Channel[];nextCursor?:string}{
  const videos:Video[]=[],channels:Channel[]=[],seenV=new Set<string>(),seenC=new Set<string>();
  const queue:Array<[unknown,number]>=[[payload,0]];
  let visits=0;
  while(queue.length&&visits++<3000){
    const [item,depth]=queue.shift()!;
    if(depth>15||item==null)continue;
    if(Array.isArray(item)){for(const x of item.slice(0,150))queue.push([x,depth+1]);continue;}
    const o=obj(item);if(!Object.keys(o).length)continue;
    const kind=text(o.type).toLowerCase();
    if(kind==="channel"||o.channel&&!o.video&&kind!=="video"||depth===0){
      const ch=normalizeChannel(o);if(ch&&!seenC.has(ch.id)){seenC.add(ch.id);channels.push(ch);}
    }
    if(kind==="video"||kind==="short"||o.videoId||obj(o.id).videoId||o.videoDetails||depth===0){
      const v=normalizeVideo(o);if(v&&!seenV.has(v.id)&&v.embeddable!==false){seenV.add(v.id);videos.push(v);}
    }
    // Traverse wrapper object variants from upstream including nested renderer/shelf structures.
    for(const [name,value] of Object.entries(o)){
      if(value!=null&&typeof value==="object"&&name!=="thumbnails"&&name!=="statistics"&&name!=="stats"&&name!=="author"&&name!=="avatar"&&name!=="description"&&name!=="metadata")
        queue.push([value,depth+1]);
    }
  }
  const root=obj(payload),d=obj(root.data);
  const direct=text(pick(root,"cursorNext","nextCursor","nextPageToken","continuationToken")||pick(d,"cursorNext","nextCursor","nextPageToken","continuationToken"));
  let nextCursor=direct;
  if(!nextCursor){
    const todo:Array<[unknown,number]>=[[payload,0]];
    let n=0;
    while(todo.length&&n++<350){
      const [candidate,depth]=todo.shift()!;
      if(depth>8||candidate==null)continue;
      if(Array.isArray(candidate)){for(const x of candidate.slice(0,35))todo.push([x,depth+1]);continue;}
      const x=obj(candidate);
      nextCursor=text(pick(x,"cursorNext","nextCursor","nextPageToken","continuationToken","continuation"));
      if(nextCursor)break;
      for(const key of ["continuations","continuation","next","pagination","data","response","contents","items"]){
        if(x[key]!=null&&typeof x[key]==="object")todo.push([x[key],depth+1]);
      }
    }
  }
  return {videos,channels,nextCursor:nextCursor||undefined};
}
type Provider={name:"primary"|"secondary";host:string;key:string;base:string;dailyLimit:number;
 searchPath:string;searchParam:string;videoPath:string;videoParam:string};
const limits=new Map<string,{day:string;used:number;until:number}>();
const diagnostics=new Map<string,{lastStatus:string;at:string}>();
const note=(p:Provider,status:string)=>diagnostics.set(p.name,{lastStatus:status,at:new Date().toISOString()});
export function providerDiagnostics(){
  const configuredProviders=providers();
  return {configuredProviders:configuredProviders.map(p=>({
    name:p.name,host:p.host,
    state:diagnostics.get(p.name)?.lastStatus||"configured_not_tested",
    lastChecked:diagnostics.get(p.name)?.at||null,
    cooldownActive:(limits.get(p.name)?.until||0)>Date.now()
  })),configured:configuredProviders.length>0,environment:"server"};
}
function configured(which:"PRIMARY"|"SECONDARY"):Provider|null{
  const k="RAPIDAPI_"+which+"_";
  const host=process.env[k+"HOST"]||"",key=process.env[k+"KEY"]||"",base=process.env[k+"BASE_URL"]||"";
  if(!host||!key||!base)return null;
  try{const url=new URL(base);if(url.protocol!=="https:"||url.hostname!==host)return null;}catch{return null;}
  return {name:which.toLowerCase() as "primary"|"secondary",host,key,base,
    searchPath:process.env[k+"SEARCH_PATH"]||"/search/",searchParam:process.env[k+"SEARCH_PARAM"]||"q",
    videoPath:process.env[k+"VIDEO_PATH"]||"/video/details/",videoParam:process.env[k+"VIDEO_PARAM"]||"id",
    dailyLimit:Math.max(0,Number(process.env[k+"DAILY_LIMIT"]||0))};
}
const providers=()=> (["PRIMARY","SECONDARY"] as const).map(configured).filter((x):x is Provider=>x!==null);
export function providerNames(){return providers().map(x=>x.name);}
async function send(p:Provider,path:string,params:Record<string,string>):Promise<unknown|null>{
  const day=new Date().toISOString().slice(0,10),existing=limits.get(p.name);
  const state=existing?.day===day?existing:{day,used:0,until:0};limits.set(p.name,state);
  if(Date.now()<state.until){note(p,"cooldown");return null;}
  if(p.dailyLimit>0&&state.used>=p.dailyLimit){note(p,"local_limit_reached");return null;}
  if(!path.startsWith("/")||path.startsWith("//"))return null;
  const url=new URL(path,p.base);if(url.origin!==new URL(p.base).origin)return null;
  for(const [k,v] of Object.entries(params))if(v)url.searchParams.set(k,v);
  state.used++;
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),7500);
  try{
    const res=await fetch(url,{headers:{"x-rapidapi-host":p.host,"x-rapidapi-key":p.key,Accept:"application/json"},cache:"no-store",signal:ctl.signal});
    if(!res.ok){note(p,"upstream_http_"+res.status);if([401,403,429].includes(res.status))state.until=Date.now()+(res.status===429?180000:900000);
      else if(res.status>=500)state.until=Date.now()+30000;return null;}
    const payload=await res.json() as unknown;note(p,"upstream_ok");return payload;
  }catch{note(p,"network_timeout_or_error");state.until=Date.now()+30000;return null;}finally{clearTimeout(timeout);}
}
export type Mode="home"|"trending"|"search"|"video"|"channel"|"channelVideos"|"suggest"|"related";
export async function remote(mode:Mode,arg="",cursor=""):Promise<{data:unknown;provider:string}|null>{
  for(const p of providers()){
    const isYT=p.host==="youtube138.p.rapidapi.com";
    let path:string,params:Record<string,string>;
    if(mode==="video"){path=p.videoPath;params={[p.videoParam]:arg};}
    else if(mode==="search"){path=p.searchPath;params={[p.searchParam]:arg,cursor};}
    else if(mode==="home"){path=isYT?"/home/":p.searchPath;params=isYT?{cursor,hl:"en",gl:"IN"}:{[p.searchParam]:"popular videos"};}
    else if(mode==="trending"){if(!isYT)continue;path="/v2/trending";params={};}
    else if(!isYT)continue;
    else if(mode==="channel"){path="/channel/details/";params={id:arg};}
    else if(mode==="channelVideos"){path="/channel/videos/";params={id:arg,filter:"videos_latest",cursor};}
    else if(mode==="suggest"){path="/auto-complete/";params={q:arg};}
    else {path="/video/related-contents/";params={id:arg,cursor};}
    const data=await send(p,path,params);
    if(data!==null)return {data,provider:p.name};
  }
  return null;
}
export async function lookupVideos({query="",category="All",videoId="",channelId="",relatedId="",cursor="",feed=""}:{
  query?:string;category?:string;videoId?:string;channelId?:string;relatedId?:string;cursor?:string;feed?:string
}):Promise<VideoResponse>{
  const mode:Mode=videoId?"video":channelId?"channelVideos":relatedId?"related":feed==="shorts"?"search":query||category!=="All"?"search":"home";
  const term=videoId||channelId||relatedId||(feed==="shorts"?"#shorts":query)||(category==="All"?"":category);
  let found=await remote(mode,term,cursor);
  let normalized=found?normalizeResults(found.data):{videos:[],channels:[],nextCursor:undefined as string|undefined};
  // Home and the distinct trending feed are two legitimate discovery sources.
  // If home returns an unusually sparse initial batch, use trending as a fallback.
  // Never substitute a different source for a continuation page.
  if(mode==="home"&&!cursor&&normalized.videos.length<4){
    const trending=await remote("trending");
    if(trending){const more=normalizeResults(trending.data);
      if(more.videos.length>normalized.videos.length){found=trending;normalized=more;}
    }
  }
  if(found&&(normalized.videos.length||normalized.channels.length)){
    const onlyShorts=feed==="shorts";
    const videos=onlyShorts?normalized.videos.filter(v=>v.isShort):normalized.videos;
    return {...normalized,videos,channels:onlyShorts?[]:normalized.channels,source:"marketplace",provider:found.provider};
  }
  if(videoId||query||channelId||relatedId||feed==="shorts"||cursor)return {videos:[],channels:[],source:"demo",message:feed==="shorts"?
    "No Shorts positively identified by the provider. Ordinary videos are never shown in Shorts.":
    "No live results returned. Check /api/health for provider configuration and upstream status."};
  return {videos:filterDemo("",category),channels:[],source:"demo",message:"Live feed unavailable. Check /api/health and Vercel environment settings. Showing a clearly labeled demo catalog."};
}
export async function lookupChannel(id:string):Promise<Channel|null>{
  const found=await remote("channel",id);if(!found)return null;
  return normalizeChannel(found.data)||normalizeResults(found.data).channels[0]||null;
}
export async function lookupSuggestions(q:string):Promise<string[]>{
  const found=await remote("suggest",q);if(!found)return [];
  const r=obj(found.data);
  const source=[found.data,r.results,r.suggestions,r.queries,r.items,r.data,obj(r.data).suggestions].find(Array.isArray);
  if(!source)return [];
  return [...new Set(arr(source).map(x=>text(x)||text(pick(x,"query","suggestion"))).filter(v=>v&&v.length<130))].slice(0,8);
}
// IMPORTANT: This is a per-instance soft limit, not a global quota. Restrict usage and
// spending in the RapidAPI dashboard; never use fallback APIs to bypass provider limits.
