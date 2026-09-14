// New players start below the pack (see players.mmr's own default in
// supabase/migrations) and get a flat MMR cushion on top of the normal
// Elo result for each of their first few matches — win, lose, or draw —
// so a rough first outing or two doesn't bury them before their actual
// skill has had a chance to show. See app/matches/new/page.tsx's
// applyRookieBonus for where this is spent, keyed off players.matches_played
// (the count *before* the match currently being recorded).

export const STARTING_MMR = 700;
export const ROOKIE_MATCH_THRESHOLD = 3;
export const ROOKIE_MMR_BONUS = 100;

export const isRookie = (matchesPlayed: number): boolean =>
  matchesPlayed < ROOKIE_MATCH_THRESHOLD;
