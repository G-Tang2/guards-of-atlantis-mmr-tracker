// A "bounty hero" is one nobody has picked in the last BOUNTY_THRESHOLD
// matches (or ever) — playing one awards a flat MMR bonus regardless of the
// match outcome, to nudge the roster away from a handful of favorites.

export const BOUNTY_THRESHOLD = 7;
export const BOUNTY_MMR_BONUS = 5;

// The Arcane badge's shorter bounty window (see lib/badges.ts) and the
// Wayward badge's boosted payout — see app/matches/new/page.tsx's
// applyBounty and app/heroes/page.tsx for where these are used. Arcane
// uses the same "nobody's played it" global rule as the base threshold
// above, just a shorter window — every hero that's bounty under the
// 7-game rule is automatically also bounty under this 5-game one.
export const ARCANE_BOUNTY_THRESHOLD = 5;
export const WAYWARD_BOUNTY_MMR_BONUS = 7;

type MatchForBounty = {
  match_players: { hero_id: string | null }[];
};

// `matches` must be ordered newest-first (created_at descending) — the same
// order app/heroes/page.tsx already queries in for its own "games ago" stat.
export function computeBountyHeroIds(
  matches: MatchForBounty[],
  allHeroIds: string[],
  threshold: number = BOUNTY_THRESHOLD,
): Set<string> {
  const lastPlayedGame = new Map<string, number>();

  matches.forEach((match, gameIndex) => {
    match.match_players.forEach((mp) => {
      if (!mp.hero_id) return;
      if (!lastPlayedGame.has(mp.hero_id)) {
        lastPlayedGame.set(mp.hero_id, gameIndex + 1);
      }
    });
  });

  const bountyIds = new Set<string>();
  allHeroIds.forEach((heroId) => {
    const last = lastPlayedGame.get(heroId);
    if (last === undefined || last > threshold) {
      bountyIds.add(heroId);
    }
  });
  return bountyIds;
}
