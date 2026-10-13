-- Paste into Supabase SQL Editor. All user-specific records are protected by RLS.
create table if not exists public.user_video_actions (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null check (video_id ~ '^[a-zA-Z0-9_-]{11}$'),
  kind text not null check (kind in ('history','saved','liked')),
  title text not null default '',
  thumbnail text not null default '',
  channel text not null default '',
  position_seconds integer not null default 0 check (position_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id, kind)
);
create index if not exists user_video_actions_recent_idx on public.user_video_actions (user_id,kind,updated_at desc);
alter table public.user_video_actions enable row level security;
create policy "owner read video actions" on public.user_video_actions for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert video actions" on public.user_video_actions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner update video actions" on public.user_video_actions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner delete video actions" on public.user_video_actions for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.user_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.user_subscriptions enable row level security;
create policy "owner read subscriptions" on public.user_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert subscriptions" on public.user_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner delete subscriptions" on public.user_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

-- These are PeakTube-native comments, NOT YouTube comments. Only signed-in users can write.
create table if not exists public.app_comments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null check (video_id ~ '^[a-zA-Z0-9_-]{11}$'),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists app_comments_video_idx on public.app_comments(video_id, created_at desc);
alter table public.app_comments enable row level security;
create policy "signed in read comments" on public.app_comments for select to authenticated using (true);
create policy "owner create comments" on public.app_comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner remove comments" on public.app_comments for delete to authenticated using ((select auth.uid()) = user_id);
