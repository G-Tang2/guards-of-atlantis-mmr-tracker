-- Backs the Battle Board's shareable turn-by-turn sequences (see the
-- sequence builder in components/HexBoard.tsx and the read-only viewer at
-- app/board/sequence/[id]) — a published sequence is a one-time snapshot
-- (unlike ranked_vote_sessions, nothing here needs to sync live), so this
-- is just a plain table: whoever built the sequence writes it once (or
-- again, to update the same link after edits — see shareSequence), and
-- anyone with the link reads it.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

create table if not exists board_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  map_id text not null,
  -- One full board snapshot per step (an array of {id, pieceId, col, row,
  -- team?} placements, matching PlacedToken in components/HexBoard.tsx),
  -- not a diff from the previous step — simplest to build, load, and step
  -- through, at the cost of some redundancy between adjacent steps that
  -- barely matters at this data size.
  steps jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- This project enables RLS by default on tables created via the SQL
-- Editor, unlike matches/players/etc. (created before that default
-- existed) — there's no real auth in this app at all (the shared password
-- gate is a client-side localStorage check, not Supabase auth), so every
-- table the publishable key touches needs open access the same way those
-- already do. Without this, every read/write against this table 401s with
-- "new row violates row-level security policy".
alter table board_sequences disable row level security;
