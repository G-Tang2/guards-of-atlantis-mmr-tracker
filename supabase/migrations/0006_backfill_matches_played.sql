-- 0004_rookie_mmr_bonus.sql deliberately left matches_played at 0 for
-- every existing player (a "count from now on" choice) — that turned out
-- wrong: an established player with, say, 80 real matches under their
-- belt was reading as a rookie again and getting the +100 first-three-
-- matches bonus they shouldn't. This backfills matches_played from the
-- real match_players history instead, so it reflects every match a
-- player has actually recorded, not just ones recorded after 0004.
--
-- Run this once in the Supabase Dashboard's SQL Editor. Safe to re-run —
-- it always recomputes from match_players, which is the source of truth.

update players p
set matches_played = (
  select count(*) from match_players mp where mp.player_id = p.id
);
