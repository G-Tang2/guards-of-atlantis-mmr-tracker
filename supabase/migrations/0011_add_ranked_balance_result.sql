-- Stores the full outcome of a Ranked Balance vote (every option offered,
-- its vote tally, and which one won) on the match it produced, so it can
-- be shown on that match's detail page (see app/matches/[id]/page.tsx) —
-- otherwise this detail is lost the moment voting finishes, since
-- /teams/vote's own working storage is cleared right after (see
-- lib/rankedBalanceResult.ts for the JSON shape written here). Null for
-- any match not drafted via Ranked Balance.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

alter table matches add column if not exists ranked_balance_result jsonb;
