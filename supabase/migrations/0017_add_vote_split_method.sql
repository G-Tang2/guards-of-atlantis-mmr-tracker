-- The "Balanced" button on /teams now reuses the exact same ban/choose
-- voting flow as Ranked Balance (see app/teams/vote/page.tsx), just with
-- MMR-weighted splits (lib/rankedBalance.ts's mmrBalancedSplits) instead
-- of the hand-assigned skill points rankedBalancedSplits uses. Both share
-- one ranked_vote_sessions row shape (see migration 0012), so this column
-- is what a session remembers about which splitter produced its `splits`
-- — needed so a page loading an existing session (this device on resume,
-- or any remote voter on /vote/[id]) shows the right title/copy without
-- having to recompute or guess from the data alone.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

alter table ranked_vote_sessions
  add column if not exists split_method text not null default 'ranked';
