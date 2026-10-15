export type Video = {
  id: string; title: string; channel: string; channelId: string; description: string;
  thumbnail: string; views: string; publishedAt: string; duration: string; category: string;
  isShort: boolean; embeddable: boolean|null; madeForKids: boolean|null;
  channelAvatar?: string; subscriberCount?: string; likeCount?: string;
  commentCount?: string; publishedText?: string;
};
export type Channel = { id: string; title: string; avatar: string; banner?: string; handle?: string; description?: string; subscribers?: string; videos?: string; };
export type VideoResponse = { videos: Video[]; channels?: Channel[]; nextCursor?: string; source: "marketplace"|"demo"; provider?: string; message?: string; diagnostics?: {mode:string;upstreamReceived:boolean;topLevelFields:string[];parsedVideos:number;parsedChannels:number;hasNextPage:boolean;stages:{mode:string;items:number;fields:string[]}[]}; };
export type LibraryKind = "history"|"saved"|"liked";
export type LibraryRow = { video_id: string; kind: LibraryKind; title: string; thumbnail: string; channel: string; position_seconds: number; updated_at?: string; };
export type SubscriptionRow = { channel_id: string; channel_name: string; };
