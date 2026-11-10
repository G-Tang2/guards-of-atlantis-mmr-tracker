-- The Base badge reward is changing from "a second full vote" to "your
-- one vote counts as 1.5x" (see lib/badges.ts and lib/rankedVoteSession.ts)
-- — vote_allowance stored a TAP COUNT per player (1 or 2); its successor,
-- vote_weight, stores how much a single tap is worth (1 or 1.5) instead.
-- Every player now gets exactly one tap, so the old per-player "allowance"
-- concept has no remaining use. Any vote session already in flight when
-- this runs predates the change and may behave oddly if resumed — these
-- rows are short-lived (a single evening's vote), so that's an acceptable
-- edge case rather than something worth a data migration.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

alter table ranked_vote_sessions
  rename column vote_allowance to vote_weight;
