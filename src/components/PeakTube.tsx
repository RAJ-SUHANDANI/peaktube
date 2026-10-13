"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Menu, Search, Moon, Sun, Home, Clapperboard, History, Bookmark, ThumbsUp, Music, Gamepad2, UserRound, LogOut, ArrowDown, ArrowUp, Heart, Share2, Play, Bell, Library, Compass, LoaderCircle } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { demoVideos } from "@/lib/demo";
import type { Video, VideoResponse, Channel, LibraryKind, LibraryRow, SubscriptionRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

type Page = "home"|"shorts"|"subscriptions"|"history"|"saved"|"liked"|"account"|"watch"|"channel";
const categories = ["All","Music","Gaming","Travel","Technology","Science","Animation","History","Popular"];
const iconMap = { home: Home, shorts: Clapperboard, subscriptions: Library, history: History, saved: Bookmark, liked: ThumbsUp, Music, Gaming: Gamepad2 };
function initial(v: string){ return v.trim().slice(0, 1).toUpperCase() || "P"; }
function formatDate(input: string) { if (!input) return ""; const date = new Date(input); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(); }
function VideoCard({video,onOpen,onSave,onChannel}:{video:Video;onOpen:(v:Video)=>void;onSave:(v:Video)=>void;onChannel?:(v:Video)=>void}) {
  return <article className="video-card"><button className="thumbnail" onClick={()=>onOpen(video)} aria-label={"Watch "+video.title}><img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer"/>{video.duration && <span className="duration">{video.duration}</span>}</button>
    <div className="card-info"><button className="circle" style={{border:0,overflow:"hidden",padding:0}} onClick={()=>onChannel?.(video)} title={"Open "+video.channel}>{video.channelAvatar?<img src={video.channelAvatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initial(video.channel)}</button><div className="card-text"><button className="card-title" onClick={()=>onOpen(video)}>{video.title}</button><div className="meta"><button className="channel-link" onClick={()=>onChannel?.(video)}>{video.channel}</button><br/>{[video.views?(video.views+" views"):"",video.publishedText||formatDate(video.publishedAt)].filter(Boolean).join(" · ") || "YouTube video"}</div></div><button className="icon-btn" style={{width:29,height:29}} onClick={()=>onSave(video)} title="Toggle Watch Later"><Bookmark size={17}/></button></div></article>;
}
export default function PeakTube() {
  const [page,setPage] = useState<Page>("home");
  const [sidebar,setSidebar] = useState(true);
  const [dark,setDark] = useState(false);
  const [category,setCategory] = useState("All");
  const [query,setQuery] = useState("");
  const [draft,setDraft] = useState("");
  const [videos,setVideos] = useState<Video[]>(demoVideos);
  const [channels,setChannels] = useState<Channel[]>([]);
  const [cursor,setCursor] = useState("");
  const [suggestions,setSuggestions] = useState<string[]>([]);
  const [showSuggestions,setShowSuggestions] = useState(false);
  const [selectedChannel,setSelectedChannel] = useState<Channel|null>(null);
  const [channelVideos,setChannelVideos] = useState<Video[]>([]);
  const [origin,setOrigin] = useState<VideoResponse["source"]>("demo");
  const [sourceMessage,setSourceMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [active,setActive] = useState<Video>(demoVideos[0]);
  const [shortIndex,setShortIndex] = useState(0);
  const [shorts,setShorts] = useState<Video[]>([]);
  const [shortCursor,setShortCursor] = useState("");
  const [shortLoading,setShortLoading] = useState(false);
  const [related,setRelated] = useState<Video[]>([]);
  const [providerHealth,setProviderHealth] = useState("");
  const loadSentinel=useRef<HTMLDivElement|null>(null);
  const loadMoreRef=useRef<()=>void>(()=>{});
  const isMoreLoading=useRef(false);
  const staleLoad=useRef(0);
  const [user,setUser] = useState<User|null>(null);
  const [library,setLibrary] = useState<LibraryRow[]>([]);
  const [subscriptions,setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [comments,setComments] = useState<{id:string;body:string;user_id:string}[]>([]);
  const [comment,setComment] = useState("");
  const [message,setMessage] = useState("");
  const [email,setEmail] = useState("");
  const [authBusy,setAuthBusy] = useState(false);
  const [watchPosition,setWatchPosition] = useState(0);
  useEffect(()=>{if(draft.trim().length<2){setSuggestions([]);return;}const c=new AbortController();const t=setTimeout(()=>{fetch("/api/suggest?q="+encodeURIComponent(draft),{signal:c.signal}).then(r=>r.json()).then(d=>setSuggestions(Array.isArray(d.suggestions)?d.suggestions:[])).catch(()=>{});},300);return ()=>{clearTimeout(t);c.abort();};},[draft]);
  const supabase = useMemo(()=>getSupabase(),[]);
  const notify=useCallback((text:string)=>{setMessage(text);},[]);
  useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(""),3500);return ()=>clearTimeout(t);},[message]);
  useEffect(()=>{const value=window.localStorage.getItem("pt-theme");const d=value==="dark";setDark(d);document.documentElement.classList.toggle("dark",d);},[]);
  const toggleTheme=()=>setDark(d=>{const next=!d;document.documentElement.classList.toggle("dark",next);window.localStorage.setItem("pt-theme",next?"dark":"light");return next;});
  const refreshLibrary=useCallback(async(u:User|null)=>{
    if(!supabase||!u){setLibrary([]);setSubscriptions([]);return;}
    const [actions,subs]=await Promise.all([
      supabase.from("user_video_actions").select("*").eq("user_id",u.id).order("updated_at",{ascending:false}),
      supabase.from("user_subscriptions").select("channel_id,channel_name").eq("user_id",u.id)
    ]);
    if(actions.error)notify("Run the Supabase schema migration to enable your library.");
    else setLibrary((actions.data||[]) as LibraryRow[]);
    if(!subs.error)setSubscriptions((subs.data||[]) as SubscriptionRow[]);
  },[supabase,notify]);
  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getUser().then(({data})=>setUser(data.user)).catch(()=>{});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));
    return ()=>subscription.unsubscribe();
  },[supabase]);
  useEffect(()=>{void refreshLibrary(user);},[user,refreshLibrary]);
  const loadVideos=useCallback(async(q="",cat="All")=>{
    setBusy(true);
    const ticket=++staleLoad.current;
    try {
      const params = new URLSearchParams({q,category:cat});
      const response = await fetch("/api/videos?"+params.toString());
      if(!response.ok)throw Error("Request failed");
      const result:VideoResponse = await response.json();
      if(ticket!==staleLoad.current)return;
      setVideos(result.videos);setChannels(result.channels||[]);setCursor(result.nextCursor||"");setOrigin(result.source);setSourceMessage(result.message||"");
    } catch {if(ticket===staleLoad.current){setVideos(demoVideos);setOrigin("demo");setSourceMessage("Video service unavailable. Check /api/health and Vercel settings.");}}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{void loadVideos();},[loadVideos]);
  const navigate=(p:Page)=>{setPage(p);if(p==="home"){setCategory("All");setQuery("");setDraft("");void loadVideos();}window.scrollTo({top:0,behavior:"smooth"});};
  const runSearch=(term:string)=>{setDraft(term);setQuery(term);setShowSuggestions(false);setCategory("All");setPage("home");void loadVideos(term,"All");};
  const search=(event:FormEvent)=>{event.preventDefault();runSearch(draft.trim());};
  async function loadMore(){
    if(!cursor||isMoreLoading.current)return;
    isMoreLoading.current=true;
    try{
      const p=new URLSearchParams({q:query,category,cursor});
      const r=await fetch("/api/videos?"+p.toString());
      if(!r.ok)throw new Error("Request failed");
      const result:VideoResponse=await r.json();
      setVideos(old=>{const existing=new Set(old.map(v=>v.id));return [...old,...result.videos.filter(v=>!existing.has(v.id))]});
      setChannels(old=>{const ids=new Set(old.map(v=>v.id));return [...old,...(result.channels||[]).filter(v=>!ids.has(v.id))]});
      setCursor(result.nextCursor&&result.nextCursor!==cursor?result.nextCursor:"");
    }catch{notify("Could not fetch the next page of videos.");}
    finally{isMoreLoading.current=false;}
  }
  loadMoreRef.current=()=>{void loadMore();};
  useEffect(()=>{
    if(page!=="home"||!cursor)return;
    const target=loadSentinel.current;if(!target)return;
    const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)loadMoreRef.current();},{rootMargin:"900px"});
    observer.observe(target);return ()=>observer.disconnect();
  },[page,cursor,videos.length]);
  const loadShorts=useCallback(async(next="")=>{
    setShortLoading(true);
    try{
      const p=new URLSearchParams({feed:"shorts"});if(next)p.set("cursor",next);
      const r=await fetch("/api/videos?"+p);if(!r.ok)throw Error();
      const result:VideoResponse=await r.json();
      const valid=result.videos.filter(v=>v.isShort);
      setShorts(old=>next?[...old,...valid.filter(v=>!old.some(x=>x.id===v.id))]:valid);
      setShortCursor(result.nextCursor&&result.nextCursor!==next?result.nextCursor:"");
    }catch{if(!next)setShorts([]);setShortCursor("");}
    finally{setShortLoading(false);}
  },[]);
  useEffect(()=>{if(page==="shorts"&&shorts.length===0)void loadShorts();},[page,loadShorts,shorts.length]);
  useEffect(()=>{if(page==="shorts"&&shortCursor&&!shortLoading&&shortIndex>=shorts.length-3)void loadShorts(shortCursor);},[page,shortIndex,shortCursor,shortLoading,shorts.length,loadShorts]);
  useEffect(()=>{if(page!=="watch")return;let cancelled=false;
    fetch("/api/videos?relatedId="+encodeURIComponent(active.id)).then(r=>r.json()).then((d:VideoResponse)=>{if(!cancelled)setRelated((d.videos||[]).filter(x=>x.id!==active.id));}).catch(()=>{if(!cancelled)setRelated([])});
    return ()=>{cancelled=true};
  },[page,active.id]);
  useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(data=>{
    const state=data.videoProvider;
    if(!state?.configured)setProviderHealth("No RapidAPI provider configured on this deployment.");
    else{const p=state.configuredProviders||[];
      const bad=p.filter((x:{state:string})=>x.state.startsWith("upstream_http_")||x.state==="cooldown"||x.state==="local_limit_reached");
      setProviderHealth(bad.length?"Video provider reports: "+bad.map((x:{state:string})=>x.state).join(", "):"");
    }
  }).catch(()=>{});
  },[]);
  async function openChannel(channel:Channel){setSelectedChannel(channel);setPage("channel");setChannelVideos([]);window.scrollTo(0,0);try{const [detail,items]=await Promise.all([fetch("/api/channels?id="+encodeURIComponent(channel.id)).then(r=>r.json()),fetch("/api/videos?channelId="+encodeURIComponent(channel.id)).then(r=>r.json())]);setSelectedChannel(detail.channel||channel);setChannelVideos(items.videos||[]);}catch{notify("Channel information is unavailable.");}}
  const openVideoChannel=(v:Video)=>{if(!v.channelId){notify("This provider did not return a channel ID.");return;}void openChannel({id:v.channelId,title:v.channel,avatar:v.channelAvatar||"",subscribers:v.subscriberCount});};
  const selectCategory=(cat:string)=>{setCategory(cat);setQuery("");setDraft("");setPage("home");void loadVideos("",cat);};
  const knownVideo=(id:string)=>videos.find(v=>v.id===id)||demoVideos.find(v=>v.id===id)||null;
  async function upsertAction(kind:LibraryKind,video:Video,position=0){
    if(!user||!supabase){notify("Sign in to save your activity across devices.");return;}
    const existing=library.some(x=>x.video_id===video.id&&x.kind===kind);
    if(existing && kind!=="history"){
      const {error}=await supabase.from("user_video_actions").delete().eq("user_id",user.id).eq("video_id",video.id).eq("kind",kind);
      if(error)notify("Could not update your library.");else await refreshLibrary(user);
      return;
    }
    const {error}=await supabase.from("user_video_actions").upsert({user_id:user.id,video_id:video.id,kind,title:video.title,thumbnail:video.thumbnail,channel:video.channel,position_seconds:position,updated_at:new Date().toISOString()},{onConflict:"user_id,video_id,kind"});
    if(error)notify("Could not update your library.");else await refreshLibrary(user);
  }
  function openVideo(v:Video){setActive(v);setWatchPosition(0);setPage("watch");setComments([]);void upsertAction("history",v);window.scrollTo(0,0);
    fetch("/api/videos?id="+encodeURIComponent(v.id)).then(r=>r.json()).then((d:VideoResponse)=>{if(d.videos?.length)setActive(old=>old.id===v.id?{...old,...d.videos[0]}:old);}).catch(()=>{});
  }
  const currentVideo = useCallback((row:LibraryRow):Video=>knownVideo(row.video_id)||{
    id:row.video_id,title:row.title,thumbnail:row.thumbnail,channel:row.channel,channelId:"",description:"",views:"",publishedAt:"",duration:"",category:"All",isShort:false,embeddable:null,madeForKids:null
  },[videos]);
  const short=shorts[shortIndex];
  const libraryVideos=useMemo(()=>{
    if(page==="subscriptions")return videos.filter(v=>subscriptions.some(s=>s.channel_id===v.channelId&&(v.channelId!=="")));
    return library.filter(x=>x.kind===page).map(currentVideo);
  },[page,library,videos,subscriptions,currentVideo]);
  useEffect(()=>{
    if(page!=="watch"||!user||!supabase||active.madeForKids===true)return;
    let last=0;
    const listener=(event:MessageEvent)=>{
      if(!event.origin.endsWith("youtube.com")&&!event.origin.endsWith("youtube-nocookie.com"))return;
      if(typeof event.data!=="string")return;
      try {const payload=JSON.parse(event.data);if(payload.event==="infoDelivery"&&typeof payload.info?.currentTime==="number"){
        const pos=Math.floor(payload.info.currentTime);
        setWatchPosition(pos);
        if(pos>0&&Date.now()-last>20000){last=Date.now();void upsertAction("history",active,pos);}
      }}catch{}
    };
    window.addEventListener("message",listener);return ()=>window.removeEventListener("message",listener);
  // User history still works even if YouTube IFrame state messages are unavailable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page,active.id,user?.id]);
  useEffect(()=>{
    if(page!=="watch"||!supabase||!user||active.madeForKids===true)return;
    supabase.from("app_comments").select("id,body,user_id").eq("video_id",active.id).order("created_at",{ascending:false}).limit(50)
      .then(({data})=>setComments((data||[]).map(x=>({id:String(x.id),body:String(x.body),user_id:String(x.user_id)}))));
  },[page,active.id,supabase,user]);
  async function submitComment(e:FormEvent){
    e.preventDefault();if(!supabase||!user){notify("Sign in to comment.");return;}if(active.madeForKids===true){notify("Comments unavailable for this video.");return;}
    const body=comment.trim();if(!body||body.length>1000)return;
    const {error}=await supabase.from("app_comments").insert({user_id:user.id,video_id:active.id,body});
    if(error)notify("Could not post the comment.");else{setComments(old=>[{id:String(Date.now()),body,user_id:user.id},...old]);setComment("");}
  }
  async function toggleSubscribe(video:Video){
    if(!supabase||!user){notify("Sign in to subscribe.");return;}
    if(!video.channelId){notify("This video has no verified channel ID.");return;}
    const existing=subscriptions.some(s=>s.channel_id===video.channelId);
    const response=existing?await supabase.from("user_subscriptions").delete().eq("user_id",user.id).eq("channel_id",video.channelId):
      await supabase.from("user_subscriptions").insert({user_id:user.id,channel_id:video.channelId,channel_name:video.channel});
    if(response.error)notify("Subscription update failed.");else await refreshLibrary(user);
  }
  async function signIn(){
    if(!supabase){notify("Configure Supabase first.");return;}
    setAuthBusy(true);
    const callback=window.location.origin;
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:callback}});
    if(error)notify(error.message);else notify("Check your email for a sign-in link.");
    setAuthBusy(false);
  }
  async function signOut(){await supabase?.auth.signOut();navigate("home");}
  const navs: Array<{p:Page;label:string;Icon:typeof Home}>=[
    {p:"home",label:"Home",Icon:Home},{p:"shorts",label:"Shorts",Icon:Clapperboard},{p:"subscriptions",label:"Subscriptions",Icon:Library},
    {p:"history",label:"History",Icon:History},{p:"saved",label:"Watch Later",Icon:Bookmark},{p:"liked",label:"Liked videos",Icon:ThumbsUp}
  ];
  return <div className="app">
    <header className="top">
      <button className="icon-btn" aria-label="Toggle sidebar" onClick={()=>setSidebar(s=>!s)}><Menu/></button>
      <button className="brand" style={{border:0,background:"transparent",padding:0,cursor:"pointer"}} onClick={()=>navigate("home")}><span className="brand-icon"><Play fill="currentColor" size={16}/></span>PeakTube</button>
      <div className="search-wrapper"><form className="search-form" onSubmit={search}><input value={draft} onFocus={()=>setShowSuggestions(true)} onChange={e=>{setDraft(e.target.value);setShowSuggestions(true);}} onKeyDown={e=>{if(e.key==="Escape")setShowSuggestions(false);}} placeholder="Search" aria-label="Search videos"/><button aria-label="Search" type="submit"><Search size={20}/></button></form>{showSuggestions&&draft.trim().length>=2&&suggestions.length>0&&<div className="suggestions-popup">{suggestions.map(x=><button key={x} onClick={()=>runSearch(x)}><Search size={15}/>{x}</button>)}</div>}</div>
      <div className="top-right"><button className="icon-btn" onClick={toggleTheme} aria-label="Switch theme">{dark?<Sun/>:<Moon/>}</button><button className="icon-btn" onClick={()=>notify("No new notifications.")} aria-label="Notifications"><Bell/></button><button className="profile-btn" onClick={()=>navigate("account")} aria-label="Account">{user?initial(user.email||"P"):<UserRound size={19}/>}</button></div>
    </header>
    <div className="layout"><aside className={"sidebar "+(sidebar?"":"closed")}>
      {navs.map(({p,label,Icon},i)=><div key={p}>{i===3&&<><div className="divider"/><div className="side-label">You</div></>}<button onClick={()=>navigate(p)} className={"nav-link "+(p===page?"active":"")} title={label}><Icon size={20}/><span className="nav-label">{label}</span></button></div>)}
      <div className="divider"/><div className="side-label">Explore</div>
      <button className="nav-link" onClick={()=>selectCategory("Music")}><Music size={20}/><span className="nav-label">Music</span></button>
      <button className="nav-link" onClick={()=>selectCategory("Gaming")}><Gamepad2 size={20}/><span className="nav-label">Gaming</span></button>
      <button className="nav-link" onClick={()=>selectCategory("Technology")}><Compass size={20}/><span className="nav-label">Technology</span></button>
    </aside>
    <main className="content">
      {page==="home"&&<><div className="chips">{categories.map(c=><button key={c} className={"chip "+(category===c?"active":"")} onClick={()=>selectCategory(c)}>{c}</button>)}</div>
      {query&&<p className="section-desc">Search results for “{query}”</p>}
      {origin==="demo"&&<div className="notice">{sourceMessage||"Sample catalog — live data unavailable."} {providerHealth&&<span>{providerHealth} </span>}<a href="/api/health" target="_blank" rel="noreferrer">Check API status</a></div>}
      {channels.length>0&&<div className="channel-results">{channels.map(ch=><button className="channel-result" key={ch.id} onClick={()=>void openChannel(ch)}><div className="channel-result-avatar">{ch.avatar?<img src={ch.avatar} alt=""/>:initial(ch.title)}</div><div><strong>{ch.title}</strong><p>{[ch.handle,ch.subscribers?ch.subscribers+" subscribers":""].filter(Boolean).join(" · ")}</p><small>{ch.description}</small></div></button>)}</div>}
      {busy?<p className="section-desc"><LoaderCircle size={15}/> Loading videos…</p>:videos.length?<div className="video-grid">{videos.map(v=><VideoCard key={v.id} video={v} onOpen={openVideo} onChannel={openVideoChannel} onSave={v=>void upsertAction("saved",v)}/>)}</div>:<div className="empty">No videos found. Try another search.</div>}{cursor&&<div ref={loadSentinel} style={{textAlign:"center",marginTop:28,padding:24}}><button className="action" onClick={()=>void loadMore()}>Load more videos ↓</button></div>}</>}
      {page==="watch"&&<div className="watch-layout"><section>
        <iframe className="player" title={active.title} key={active.id} src={"https://www.youtube-nocookie.com/embed/"+active.id+"?enablejsapi=1&origin="+encodeURIComponent(typeof window!=="undefined"?window.location.origin:"")} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
        <h1 className="watch-title">{active.title}</h1><div className="watch-details"><button className="circle" style={{padding:0,border:0,overflow:"hidden"}} onClick={()=>openVideoChannel(active)}>{active.channelAvatar?<img src={active.channelAvatar} alt="" style={{height:"100%",width:"100%",objectFit:"cover"}}/>:initial(active.channel)}</button><div><button className="channel-link" onClick={()=>openVideoChannel(active)}><strong>{active.channel}</strong></button><div className="meta">{active.subscriberCount?active.subscriberCount+" subscribers":""}</div></div><button className="primary" onClick={()=>void toggleSubscribe(active)}>{subscriptions.some(s=>s.channel_id===active.channelId&&!!active.channelId)?"Subscribed":"Subscribe"}</button><div className="space"/><button className={"action "+(library.some(x=>x.video_id===active.id&&x.kind==="liked")?"on":"")} onClick={()=>void upsertAction("liked",active)}><Heart size={14}/> {active.likeCount||"Like"}</button><button className="action" onClick={()=>void upsertAction("saved",active)}><Bookmark size={14}/> Save</button><button className="action" onClick={()=>{void navigator.clipboard?.writeText(window.location.origin+"?v="+active.id);notify("Video link copied.");}}><Share2 size={14}/> Share</button></div>
        <div className="info"><strong>{[active.views?active.views+" views":"",active.publishedText||formatDate(active.publishedAt)].filter(Boolean).join(" · ")}</strong>{"\n"}{active.description||"Watch this video on YouTube through the official embedded player."}{watchPosition>0?"\nLast known position: "+Math.floor(watchPosition)+"s":""}</div>
        <div className="comments"><h3>PeakTube comments</h3>{active.madeForKids===true?<p className="section-desc">Comments are disabled for videos marked Made for Kids.</p>:<><form className="comment-form" onSubmit={e=>void submitComment(e)}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder={user?"Add a comment…":"Sign in to comment"} maxLength={1000}/><button className="primary" type="submit">Comment</button></form>{comments.map(c=><div className="comment" key={c.id}><strong>{c.user_id===user?.id?"You":"Community member"}</strong><p>{c.body}</p></div>)}</>}</div>
      </section><aside className="suggestions"><h3>Up next</h3>{(related.length?related:videos.filter(v=>v.id!==active.id)).slice(0,24).map(v=><button className="suggestion" key={v.id} onClick={()=>openVideo(v)}><img src={v.thumbnail} alt=""/><span><strong>{v.title}</strong><small>{v.channel}<br/>{v.views}</small></span></button>)}</aside></div>}
      {page==="channel"&&selectedChannel&&<><div className="channel-banner">{selectedChannel.banner&&<img src={selectedChannel.banner} alt=""/>}</div><div className="channel-profile"><div className="channel-profile-avatar">{selectedChannel.avatar?<img src={selectedChannel.avatar} alt=""/>:initial(selectedChannel.title)}</div><div><h1>{selectedChannel.title}</h1><p>{[selectedChannel.handle,selectedChannel.subscribers?selectedChannel.subscribers+" subscribers":"",selectedChannel.videos?selectedChannel.videos+" videos":""].filter(Boolean).join(" · ")}</p><p>{selectedChannel.description}</p></div></div><h2 className="section-title">Videos</h2>{channelVideos.length?<div className="video-grid">{channelVideos.map(v=><VideoCard key={v.id} video={v} onOpen={openVideo} onChannel={openVideoChannel} onSave={v=>void upsertAction("saved",v)}/>)}</div>:<div className="empty">No channel videos are available from the connected provider.</div>}</>}
      {page==="shorts"&&<><h1 className="section-title">Shorts</h1><p className="section-desc">Swipe through short-form videos. Use the arrows to move between videos.</p>{short?<div className="shorts-layout"><div className="short-item" onTouchStart={e=>{e.currentTarget.dataset.y=String(e.touches[0].clientY)}} onTouchEnd={e=>{const diff=Number(e.currentTarget.dataset.y||0)-e.changedTouches[0].clientY;if(Math.abs(diff)>50)setShortIndex(i=>Math.max(0,Math.min(shorts.length-1,i+(diff>0?1:-1))));}}>
        <iframe title={short.title} key={short.id} src={"https://www.youtube-nocookie.com/embed/"+short.id+"?playsinline=1"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>
      </div><div className="short-actions"><button title="Like" onClick={()=>void upsertAction("liked",short)}><Heart/></button><button title="Save" onClick={()=>void upsertAction("saved",short)}><Bookmark/></button><button title="Previous" onClick={()=>setShortIndex(i=>Math.max(0,i-1))}><ArrowUp/></button><button title="Next" onClick={()=>setShortIndex(i=>Math.min(shorts.length-1,i+1))}><ArrowDown/></button></div></div>:<div className="empty">No available short-form videos.</div>}{!shorts.length&&<p className="section-desc" style={{textAlign:"center",marginTop:18}}>Only provider-confirmed Shorts can appear here. No confirmed Shorts are available right now.</p>}{shortLoading&&<p className="section-desc" style={{textAlign:"center"}}>Loading Shorts…</p>}</>}
      {["history","saved","liked","subscriptions"].includes(page)&&<><h1 className="section-title">{({history:"History",saved:"Watch Later",liked:"Liked videos",subscriptions:"Subscriptions"} as Record<string,string>)[page]}</h1><p className="section-desc">Your personal library is synchronized across devices when signed in.</p>{!user&&<div className="notice">Sign in to access your saved activity. <button className="action" onClick={()=>navigate("account")}>Sign in</button></div>}{libraryVideos.length?<div className="video-grid">{libraryVideos.map(v=><VideoCard key={v.id} video={v} onOpen={openVideo} onSave={v=>void upsertAction("saved",v)}/>)}</div>:<div className="empty">Nothing here yet. Browse videos and build your library.<p><button className="primary" onClick={()=>navigate("home")}>Explore videos</button></p></div>}</>}
      {page==="account"&&<div className="auth-panel"><h2>Welcome to PeakTube</h2>{user?<><p>Signed in as <strong>{user.email}</strong>. Your history, liked videos, saved videos and subscriptions are available across devices.</p><div className="account-options"><button className="primary" onClick={()=>navigate("saved")}>Open library</button><button className="action" onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></div></>:<><p>Sign in to synchronize history, saved videos and subscriptions. Browsing and watching are available without an account.</p>{isSupabaseConfigured()?<><form onSubmit={e=>{e.preventDefault();void signIn();}}><p>Or get a sign-in link by email:</p><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><button disabled={authBusy} className="action" type="submit">Send magic link</button></form></>:<div className="notice">Authentication needs Supabase credentials. Follow README setup steps.</div>}</>}</div>}
    </main></div>{message&&<div className="status" role="status">{message}</div>}
  </div>;
}
