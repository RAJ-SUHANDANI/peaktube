import type { Video } from "./types";

// Curated recognizable YouTube IDs for a usable keyless preview.
// Availability / embed permissions may change; never present as verified live metadata.
const videos: Array<[string, string, string, string]> = [
  ["LXb3EKWsInQ", "COSTA RICA IN 4K — wildlife & landscapes", "Nature", "Scenic film"],
  ["aqz-KE-bpKQ", "Big Buck Bunny — animated short film", "Animation", "Animated film"],
  ["jNQXAC9IVRw", "Me at the zoo — the first YouTube upload", "History", "Archive"],
  ["kJQP7kiw5Fk", "Luis Fonsi — Despacito ft. Daddy Yankee", "Music", "Music video"],
  ["hT_nvWreIhg", "OneRepublic — Counting Stars", "Music", "Music video"],
  ["9bZkp7q19f0", "PSY — GANGNAM STYLE", "Music", "Music video"],
  ["dQw4w9WgXcQ", "Rick Astley — Never Gonna Give You Up", "Music", "Music video"],
  ["e-ORhEE9VVg", "Taylor Swift — Blank Space", "Music", "Music video"],
  ["21X5lGlDOfg", "NASA — live Earth coverage (archive link)", "Science", "Space"],
];
export const demoVideos: Video[] = videos.map(([id, title, category, description]) => ({
  id, title, channel: category + " channel", channelId: "",
  description: "Sample listing: " + description + ". Live metadata will replace this when a configured provider is available.",
  thumbnail: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
  views: "", publishedAt: "", duration: "", category,
  isShort: false, embeddable: null, madeForKids: null
}));
export function filterDemo(q = "", category = "All"): Video[] {
  const search = q.trim().toLowerCase();
  return demoVideos.filter(v =>
    (!search || [v.title, v.channel, v.category].some(s => s.toLowerCase().includes(search))) &&
    (category === "All" || ["Popular", "Recently uploaded"].includes(category) || v.category.toLowerCase() === category.toLowerCase())
  );
}
