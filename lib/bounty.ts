// A "bounty hero" is one nobody has picked in the last BOUNTY_THRESHOLD
// matches (or ever) — playing one awards a flat MMR bonus regardless of the
// match outcome, to nudge the roster away from a handful of favorites.

export const BOUNTY_THRESHOLD = 7;
export const BOUNTY_MMR_BONUS = 5;

type MatchForBounty = {
  match_players: { hero_id: string | null }[];
};

// `matches` must be ordered newest-first (created_at descending) — the same
// order app/heroes/page.tsx already queries in for its own "games ago" stat.
export function computeBountyHeroIds(
  matches: MatchForBounty[],
  allHeroIds: string[],
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
    if (last === undefined || last > BOUNTY_THRESHOLD) {
      bountyIds.add(heroId);
    }
  });
  return bountyIds;
}
