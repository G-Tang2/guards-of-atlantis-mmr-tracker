-- Lets the group attach photos ("moments") to a battle, shown on its
-- detail page just above Draft Analysis (see app/matches/[id]/page.tsx).
-- Mirrors the player cover-photo pattern (a Supabase Storage upload, see
-- handleCoverChange in app/players/[id]/page.tsx) rather than the avatar's
-- own inline-base64 approach, since moment photos are arbitrary-size and
-- there can be several per match.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

create table if not exists match_moments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_moments_match_id_idx
  on match_moments (match_id);

-- Same reasoning as every other table in this project (see migration
-- 0012) — there's no real auth here, so RLS just needs to be off.
alter table match_moments disable row level security;

-- The storage bucket photos actually live in. "public" lets
-- getPublicUrl() produce a URL that serves the file with no auth needed —
-- storage.objects still enforces its own RLS independently of that flag
-- for uploads, hence the open policies below (same trust boundary as
-- every table above: no real auth in this app at all).
insert into storage.buckets (id, name, public)
values ('match-moments', 'match-moments', true)
on conflict (id) do nothing;

create policy "Public read access for match-moments"
  on storage.objects for select
  using (bucket_id = 'match-moments');

create policy "Public upload access for match-moments"
  on storage.objects for insert
  with check (bucket_id = 'match-moments');
