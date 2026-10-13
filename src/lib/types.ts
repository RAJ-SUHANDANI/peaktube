export type Video = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  description: string;
  thumbnail: string;
  views: string;
  publishedAt: string;
  duration: string;
  category: string;
  isShort: boolean;
  embeddable: boolean | null;
  madeForKids: boolean | null;
};
export type VideoResponse = {
  videos: Video[];
  source: "marketplace" | "demo";
  provider?: string;
  message?: string;
};
export type LibraryKind = "history" | "saved" | "liked";
export type LibraryRow = {
  video_id: string;
  kind: LibraryKind;
  title: string;
  thumbnail: string;
  channel: string;
  position_seconds: number;
  updated_at?: string;
};
export type SubscriptionRow = { channel_id: string; channel_name: string };
