-- New players start lower and ramp up faster: 700 starting MMR (down from
-- 1000) plus a flat +100 MMR on top of the normal Elo result for each of
-- their first three matches — see lib/rookieBonus.ts and
-- app/matches/new/page.tsx's applyRookieBonus for where this is spent.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

-- Only affects players created from now on — existing rows keep their
-- current mmr untouched.
alter table players alter column mmr set default 700;

-- Tracks how many matches a player has completed *from this point on* —
-- deliberately not backfilled from match_players history, so this is a
-- fresh count going forward rather than a judgment call on past matches.
-- Existing players start at 0 here, same as a brand-new player, and will
-- get the rookie bonus on their next three recorded matches.
alter table players add column if not exists matches_played integer not null default 0;

-- Records the flat bonus actually paid out on a given match row (null when
-- this bonus didn't apply), mirroring bounty_bonus/devoted_bonus/etc.
alter table match_players add column if not exists rookie_bonus integer;
