-- Stores a point-in-time copy of the leaderboard, taken automatically every
-- month by a Vercel Cron job (see app/api/cron/leaderboard-snapshot and
-- vercel.json). The leaderboard itself (app/leaderboard/page.tsx) has
-- always been computed live from players + matches with nothing persisted,
-- so this is purely an append-only history table — nothing else reads or
-- writes it.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

create table if not exists leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),

  -- Date the snapshot was taken (UTC), not a timestamp — this is a
  -- once-per-month record, not a precise instant.
  snapshot_date date not null,

  -- One row per player at snapshot time: { player_id, name, mmr, rank,
  -- avatar_url, matches_played }. Stored as a denormalized blob (rather
  -- than a separate per-player table) since this is read as a whole
  -- leaderboard at a time, never joined/filtered per player.
  players jsonb not null,

  created_at timestamptz not null default now()
);

create index if not exists leaderboard_snapshots_snapshot_date_idx
  on leaderboard_snapshots (snapshot_date desc);

-- Same reasoning as every other table created via the SQL Editor in this
-- project (see migration 0012) — there's no real auth here, so RLS just
-- needs to be off, not configured with policies.
alter table leaderboard_snapshots disable row level security;
