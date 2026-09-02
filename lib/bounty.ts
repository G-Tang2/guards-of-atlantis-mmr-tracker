// A "bounty hero" is one nobody has picked in the last BOUNTY_THRESHOLD
// matches (or ever) — playing one awards a flat MMR bonus regardless of the
// match outcome, to nudge the roster away from a handful of favorites.

export const BOUNTY_THRESHOLD = 7;
export const BOUNTY_MMR_BONUS = 5;

// The Arcane badge's personal bounty rule (see lib/badges.ts) and the
// Wayward badge's boosted payout — see computePersonalBountyHeroIds and
// app/matches/new/page.tsx's applyBounty for where these are used.
export const PERSONAL_BOUNTY_THRESHOLD = 5;
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

type MatchForPersonalBounty = {
  match_players: { hero_id: string | null; player_id: string }[];
};

// The Arcane badge's version of the rule above: instead of "nobody in the
// group has picked this hero recently," it's "*this specific player*
// hasn't picked it in *their own* last few games" — a much more lenient,
// personal bar. `matches` must be ordered newest-first, same contract as
// computeBountyHeroIds; unlike that function, only games this player
// actually participated in count toward the window, so the list is
// filtered down before counting rather than using every match's own index.
export function computePersonalBountyHeroIds(
  playerId: string,
  matches: MatchForPersonalBounty[],
  allHeroIds: string[],
  threshold: number = PERSONAL_BOUNTY_THRESHOLD,
): Set<string> {
  const ownMatches = matches
    .map((match) => match.match_players.find((mp) => mp.player_id === playerId))
    .filter((mp): mp is { hero_id: string | null; player_id: string } => !!mp);

  const lastPlayedGame = new Map<string, number>();
  ownMatches.forEach((mp, gameIndex) => {
    if (!mp.hero_id) return;
    if (!lastPlayedGame.has(mp.hero_id)) {
      lastPlayedGame.set(mp.hero_id, gameIndex + 1);
    }
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
