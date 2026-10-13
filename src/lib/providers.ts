import type { Video } from "./types";
import { filterDemo } from "./demo";

// Providers are deliberately configured, not silently assumed to support the same endpoints.
// Register ONLY legally authorized APIs whose terms permit the requested usage.
type Provider = {
  name: string; host: string; key: string; base: string;
  searchPath: string; searchParam: string; videoPath: string; videoParam: string;
  dailyLimit: number;
};
const state = new Map<string, { day: string; used: number; cooldownUntil: number }>();
const idPattern = /^[a-zA-Z0-9_-]{11}$/;
const clean = (x: unknown): string => typeof x === "string" ? x : typeof x === "number" ? String(x) : "";
const object = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
function configured(name: "PRIMARY" | "SECONDARY"): Provider | null {
  const p = "RAPIDAPI_" + name + "_";
  const host = process.env[p + "HOST"] || "";
  const key = process.env[p + "KEY"] || "";
  const base = process.env[p + "BASE_URL"] || "";
  if (!host || !key || !base) return null;
  // Only HTTPS, configured from trusted server-side environment variables.
  try { const url = new URL(base); if (url.protocol !== "https:" || url.hostname !== host) return null; } catch { return null; }
  return { name: name.toLowerCase(), host, key, base,
    searchPath: process.env[p + "SEARCH_PATH"] || "/search",
    searchParam: process.env[p + "SEARCH_PARAM"] || "query",
    videoPath: process.env[p + "VIDEO_PATH"] || "/video",
    videoParam: process.env[p + "VIDEO_PARAM"] || "id",
    dailyLimit: Math.max(0, Number(process.env[p + "DAILY_LIMIT"] || 0)),
  };
}
export function providerNames() {
  return (["PRIMARY", "SECONDARY"] as const).map(configured).filter((x): x is Provider => !!x).map(x => x.name);
}
function getState(p: Provider) {
  const day = new Date().toISOString().slice(0, 10);
  const current = state.get(p.name);
  if (!current || current.day !== day) { const fresh = { day, used: 0, cooldownUntil: 0 }; state.set(p.name, fresh); return fresh; }
  return current;
}
function parseDuration(input: unknown) {
  if (typeof input === "number") {
    const mins = Math.floor(input / 60), secs = Math.floor(input % 60);
    return mins + ":" + String(secs).padStart(2, "0");
  }
  return clean(input);
}
function parseOne(input: unknown): Video | null {
  const r = object(input), videoIdObj = object(r.id), snippet = object(r.snippet), details = object(r.video),
        channelObj = object(r.channel), thumbs = object(snippet.thumbnails), defaultThumb = object(thumbs.high);
  const id = clean(r.videoId || videoIdObj.videoId || r.id || details.id || details.videoId || r.video_id);
  if (!idPattern.test(id)) return null;
  const titleObj=object(r.title);
  const title = clean(titleObj.text || r.title || snippet.title || details.title) || "Untitled video";
  const thumbsArray = Array.isArray(r.thumbnails) ? r.thumbnails : [];
  const thumbFromArray = thumbsArray.length ? object(thumbsArray[thumbsArray.length-1]).url : "";
  const thumb = clean(r.thumbnail || r.thumbnailUrl || defaultThumb.url || thumbFromArray || object(r.thumbnails).url) ||
    "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
  const channel = clean(r.channelName || r.author || r.channelTitle || snippet.channelTitle || channelObj.name || object(r.author).title || details.author) || "YouTube creator";
  const embedded = r.embeddable ?? object(r.status).embeddable;
  const kids = r.madeForKids ?? object(r.status).madeForKids;
  return {
    id, title, thumbnail: thumb, channel,
    channelId: clean(r.channelId || snippet.channelId || channelObj.id || object(r.author).channelId),
    description: clean(r.description || snippet.description || details.description),
    views: clean(r.viewCount || r.views || object(r.statistics).viewCount || object(r.stats).views),
    publishedAt: clean(r.publishedAt || snippet.publishedAt || r.uploadDate),
    duration: parseDuration(r.duration || object(r.contentDetails).duration || r.lengthSeconds),
    category: clean(r.category) || "All",
    isShort: r.isShort === true,
    embeddable: typeof embedded === "boolean" ? embedded : null,
    madeForKids: typeof kids === "boolean" ? kids : null,
  };
}
export function normalizeResults(payload: unknown): Video[] {
  if (!payload) return [];
  const r = object(payload), data = object(r.data), result = object(r.result);
  const arrays = [payload, r.items, r.videos, r.results, r.contents, data.items, data.videos, data.results, result.items, result.videos];
  const found = arrays.find(Array.isArray);
  const rawItems = (Array.isArray(found) ? found : [r.video || r.data || r]) as unknown[];
  const items = rawItems.map(item => { const wrapper = object(item); return wrapper.type === "video" && wrapper.video ? wrapper.video : item; });
  const ids = new Set<string>();
  return items.map(parseOne).filter((v): v is Video => Boolean(v) && !ids.has(v!.id) && Boolean(ids.add(v!.id)));
}
async function invoke(p: Provider, type: "search" | "video", value: string): Promise<Video[]> {
  const s = getState(p);
  if (s.cooldownUntil > Date.now() || (p.dailyLimit > 0 && s.used >= p.dailyLimit)) return [];
  const path = type === "search" ? p.searchPath : p.videoPath;
  if (!path.startsWith("/") || path.startsWith("//")) return [];
  const url = new URL(path, p.base);
  if(url.origin !== new URL(p.base).origin) return [];
  url.searchParams.set(type === "search" ? p.searchParam : p.videoParam, value);
  s.used++;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { "x-rapidapi-host": p.host, "x-rapidapi-key": p.key, Accept: "application/json" },
      cache: "no-store", signal: controller.signal,
    });
    if ([401, 403, 429].includes(res.status)) { s.cooldownUntil = Date.now() + (res.status === 429 ? 60_000 : 15 * 60_000); return []; }
    if (!res.ok) { if (res.status >= 500) s.cooldownUntil = Date.now() + 30_000; return []; }
    const json: unknown = await res.json();
    return normalizeResults(json).filter(v => v.embeddable !== false);
  } catch { s.cooldownUntil = Date.now() + 15_000; return []; }
  finally { clearTimeout(timeout); }
}
export async function lookupVideos({query = "", category = "All", videoId = ""}: {query?: string; category?: string; videoId?: string}) {
  const providers = (["PRIMARY", "SECONDARY"] as const).map(configured).filter((x): x is Provider => !!x);
  for (const p of providers) {
    const isHome = !videoId && !query && category === "All";
    const results = await invoke(p, videoId ? "video" : "search", videoId || query || (isHome ? "trending" : category));
    const matching = videoId ? results.filter(x => x.id === videoId) :
      category === "All" ? results : results.filter(x => x.category === "All" || x.category.toLowerCase() === category.toLowerCase());
    if (matching.length) return { videos: matching.slice(0, 30), source: "marketplace" as const, provider: p.name };
  }
  return { videos: videoId ? filterDemo().filter(v => v.id === videoId) : filterDemo(query, category),
    source: "demo" as const,
    message: providers.length ? "All configured providers failed, have no results or have exhausted their allowance; showing sample content." :
      "Sample videos shown. Add an authorized marketplace API provider to enable live search." };
}
// Limits and failure state above are per-server-instance hints, not globally reliable quota accounting.
// Configure conservative hard limits at EACH marketplace provider; never rotate identities to evade an upstream quota.
