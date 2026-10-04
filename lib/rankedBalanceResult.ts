// Carries the outcome of a Ranked Balance vote (every option that was
// offered, its vote tally, and which one won) from /teams/vote — where the
// vote itself happens but its own working storage is cleared the moment
// voting finishes (see finish() there) — through to /matches/new, which
// saves it onto the match row so it can be shown later on that match's
// detail page (see app/matches/[id]/page.tsx). Without this, the vote
// breakdown would be lost entirely the instant the group moved on to
// recording the match.
export const RANKED_BALANCE_RESULT_STORAGE_KEY = "goa-ranked-balance-result";

// mmr/avatar_url are what the vote page's own option cards show (average
// MMR, MMR gain, avatar) — optional only because results saved before
// these were captured don't have them, and those fall back to a plain
// name list on the match page (see RankedBalanceResultSection there).
export type RankedBalanceResultPlayer = { id: string; name: string; mmr?: number; avatar_url?: string | null };

export type RankedBalanceResultOption = {
  atlantis: RankedBalanceResultPlayer[];
  titans: RankedBalanceResultPlayer[];
  // Choose-round votes this option received. 0 for an option nobody voted
  // for, or one that never reached a choose round at all (banned, or the
  // choose round itself was skipped — see chooseRoundSkipped/skippedVoting
  // below).
  votes: number;
  // Ban-round votes this option received — only meaningful when wantsBan
  // is true; omitted entirely otherwise.
  banVotes?: number;
  banned: boolean;
};

export type RankedBalanceResult = {
  totalVotes: number;
  wantsBan: boolean;
  // Only one split was possible at all for this group — it was applied
  // directly, with no vote held.
  skippedVoting: boolean;
  // A vote to ban was held, but banning left only one surviving option —
  // it was applied directly, with no choose-round vote held.
  chooseRoundSkipped: boolean;
  winnerIndex: number;
  options: RankedBalanceResultOption[];
};
