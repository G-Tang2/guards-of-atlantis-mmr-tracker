-- 0004_rookie_mmr_bonus.sql left every existing player's matches_played
-- at 0 until 0006_backfill_matches_played.sql corrected it — so on the
-- single most recent match, recorded in that gap, every participant
-- wrongly looked like a brand-new rookie and got the +100 bonus even
-- though it wasn't really among their first three matches. This
-- reverses just that one match: clears each affected player's
-- rookie_bonus and subtracts it back out of both that match's mmr_after
-- and the player's current mmr (the two are the same value, since no
-- later match has been recorded since).
--
-- Run this once, after 0006_backfill_matches_played.sql.

begin;

-- players.mmr first, while match_players.rookie_bonus still holds the
-- original (non-null) amount to read — the second statement below nulls
-- it out as part of fixing match_players itself.
with latest_match as (
  select id from matches order by match_number desc limit 1
),
affected as (
  select mp.player_id, mp.rookie_bonus
  from match_players mp
  join latest_match lm on lm.id = mp.match_id
  where mp.rookie_bonus is not null
)
update players p
set mmr = p.mmr - a.rookie_bonus
from affected a
where a.player_id = p.id;

with latest_match as (
  select id from matches order by match_number desc limit 1
)
update match_players mp
set mmr_after = mp.mmr_after - mp.rookie_bonus,
    rookie_bonus = null
from latest_match lm
where lm.id = mp.match_id
  and mp.rookie_bonus is not null;

commit;
