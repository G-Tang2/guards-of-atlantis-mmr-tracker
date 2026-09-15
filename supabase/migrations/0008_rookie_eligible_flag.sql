-- Being "new" for the rookie bonus (lib/rookieBonus.ts) means the player
-- row itself was created after this migration ran — not just "happens to
-- have a low matches_played count" (0004/0006/0007 already showed that
-- column alone isn't a safe proxy: a data correction, or any other future
-- reason matches_played might read low for an established player, would
-- wrongly re-qualify them). This adds a dedicated flag that every
-- existing player is permanently excluded from, and that only a
-- genuinely new signup gets to start with.
--
-- Run this once, after 0007_reverse_incorrect_rookie_bonus.sql.

alter table players add column if not exists rookie_eligible boolean not null default true;

-- Every player that already exists at the moment this runs is, by
-- definition, not a new signup — exclude them permanently. Rows inserted
-- after this statement (a genuinely new player) fall through to the
-- column's own default of true.
update players set rookie_eligible = false;
