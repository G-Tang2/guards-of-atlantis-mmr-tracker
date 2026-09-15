-- 0007_reverse_incorrect_rookie_bonus.sql corrected mmr but deliberately
-- left players.rank untouched — the app's "protected rank" algorithm
-- (app/matches/new/page.tsx) is stateful and only recomputes ranks
-- incrementally when a new match is recorded, using the existing rank as
-- its own starting point. With no new match played since the mmr
-- correction, the leaderboard (which sorts by this stored rank column,
-- not by raw mmr) is showing a stale order that no longer matches the
-- corrected mmr — e.g. a player landing far lower than their corrected
-- mmr warrants.
--
-- This resyncs rank to a plain descending-mmr order as a fresh baseline;
-- future matches build the protected-rank nuances back on top of this.
-- Ties keep their current relative order (falling back to name for two
-- players tied on both mmr and current rank).
--
-- Run this once, after 0007_reverse_incorrect_rookie_bonus.sql.

begin;

-- Snapshotted before ranks are cleared below — the tiebreaker needs each
-- player's *original* rank, and the clearing step would otherwise leave
-- every row reading null by the time the final ranks are computed.
create temporary table rank_resync as
select id, row_number() over (order by mmr desc, rank asc nulls last, name asc) as new_rank
from players;

-- Ranks temporarily cleared first — players.rank has a unique constraint,
-- and writing the final values directly could collide mid-statement with
-- a not-yet-updated row still holding the target number (same reasoning
-- as app/matches/new/page.tsx's own two-pass rank update).
update players set rank = null;

update players p
set rank = r.new_rank
from rank_resync r
where r.id = p.id;

drop table rank_resync;

commit;
