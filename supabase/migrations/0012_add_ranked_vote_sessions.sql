-- Backs the Ranked Balance vote (see /teams/vote) with a shared row once
-- shareable-link voting exists — every candidate split, the running tally,
-- and per-player vote usage on the shareable link, all in one place so any
-- device (the match creator's own, or a remote voter's via /vote/[id]) can
-- read and update the same live vote. Real-time Postgres changes on this
-- table are what let the creator's own page update the instant a remote
-- vote comes in, with no polling.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

create table if not exists ranked_vote_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Every player in this vote, and how many taps each of them gets (1,
  -- or 2 for a Base-badge owner — see lib/badgeRewards.ts) — computed
  -- once up front and fixed for the life of this session.
  player_ids jsonb not null,
  vote_allowance jsonb not null,

  -- The candidate splits themselves, computed once so every device sees
  -- the exact same options in the exact same order (rankedBalancedSplits
  -- involves real randomness in its tie-breaking, so recomputing it
  -- per-device/per-refresh would show different options entirely).
  splits jsonb not null,
  total_votes int not null,

  stage text not null,
  wants_ban boolean,
  active_indices jsonb not null default '[]'::jsonb,

  ban_votes jsonb not null default '[]'::jsonb,
  ban_votes_cast int not null default 0,
  -- {playerId: votes already used this ban round} — only ever consulted
  -- to gate the *shareable-link* voter (see app/vote/[id]/page.tsx) from
  -- voting more than their own allowance; the match creator's own device
  -- still taps anonymously into the same ban_votes/ban_votes_cast counters,
  -- exactly as it always has.
  ban_voters jsonb not null default '{}'::jsonb,
  banned_indices jsonb not null default '[]'::jsonb,

  votes jsonb not null default '[]'::jsonb,
  votes_cast int not null default 0,
  -- Same shape/purpose as ban_voters, for the choose round.
  voters jsonb not null default '{}'::jsonb,

  winner_index int,
  tied_indices jsonb not null default '[]'::jsonb,
  skipped_voting boolean not null default false,
  choose_round_skipped boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table ranked_vote_sessions;

-- Without this, an UPDATE that only touches a few columns (e.g. votes/
-- votes_cast on every tap) can arrive over realtime with large *unchanged*
-- jsonb columns (splits, in particular) missing from the payload entirely —
-- Postgres's logical replication is allowed to omit an unchanged TOASTed
-- value rather than resend it, unless the whole row is included regardless
-- of what changed. REPLICA IDENTITY FULL forces that, so every realtime
-- payload always carries the complete row.
alter table ranked_vote_sessions replica identity full;

-- This project enables RLS by default on tables created via the SQL
-- Editor, unlike matches/players/etc. (created before that default
-- existed) — there's no real auth in this app at all (the shared
-- password gate is a client-side localStorage check, not Supabase auth),
-- so every table the publishable key touches needs open access the same
-- way those already do. Without this, every read/write against this
-- table 401s with "new row violates row-level security policy".
alter table ranked_vote_sessions disable row level security;
