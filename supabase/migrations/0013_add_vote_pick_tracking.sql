-- Adds per-voter, per-option selection tracking to ranked_vote_sessions
-- (see migration 0012) — ban_voters/voters already record *how many* votes
-- each shareable-link voter has cast, but not *which* option(s) they
-- picked, which is all the app has needed until now (just "has this
-- person used up their allowance yet"). The remote voting page's waiting
-- screen (app/vote/[id]/page.tsx) needs to show each option's named
-- voters and let someone change their own pick, which both require
-- knowing exactly which option each voter chose.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

alter table ranked_vote_sessions
  add column if not exists ban_picks jsonb not null default '{}'::jsonb,
  add column if not exists choice_picks jsonb not null default '{}'::jsonb;
