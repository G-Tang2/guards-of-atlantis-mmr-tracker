import { Badge, BADGES } from "@/lib/badges";
import { didWin } from "@/lib/match";

// Winning with a hero for the first time boosts that match's MMR gain by
// 30% (stacks with the bounty bonus, since it's applied on top of the
// already-bounty-adjusted change).
export const FIRST_HERO_WIN_MULTIPLIER = 1.3;

export type HeroWinBonus =
  | { type: "badge"; badge: Badge }
  | { type: "first_win" }
  | null;

// `priorWonHeroIds` must reflect the player's wins from before this match.
export function computeHeroWinBonus(
  heroId: string,
  priorWonHeroIds: Set<string>,
): HeroWinBonus {
  if (priorWonHeroIds.has(heroId)) return null;

  const badge = BADGES.find((b) => b.heroIds.includes(heroId));
  if (
    badge &&
    badge.heroIds.every((id) => id === heroId || priorWonHeroIds.has(id))
  ) {
    return { type: "badge", badge };
  }

  return { type: "first_win" };
}

type FirstHeroWinRow = {
  player_id: string;
  hero_id: string | null;
  team: string;
  match_number: number;
  matches: { winner: string } | { winner: string }[] | null;
};

// Maps `${playerId}::${heroId}` to the match_number of that player's
// earliest win with that hero, across their full match history. Used to
// retroactively flag which single match earned the first-win MMR boost,
// for display (e.g. the Battle Archive's hero-pick icons).
export function buildFirstHeroWinMap(
  rows: FirstHeroWinRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const matchInfo = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    if (!matchInfo || !row.hero_id) return;
    if (!didWin(row.team, matchInfo.winner)) return;
    const key = `${row.player_id}::${row.hero_id}`;
    const existing = map.get(key);
    if (existing === undefined || row.match_number < existing) {
      map.set(key, row.match_number);
    }
  });
  return map;
}

export function isFirstHeroWinMatch(
  map: Map<string, number>,
  playerId: string,
  heroId: string | null | undefined,
  matchNumber: number,
): boolean {
  if (!heroId) return false;
  return map.get(`${playerId}::${heroId}`) === matchNumber;
}

// Maps `${playerId}::${matchNumber}` to the badge that player's hero win in
// that match completed, if any — the same "every hero in the badge now has
// a win" rule computeHeroWinBonus applies at match-record time, replayed
// chronologically per player (order matters here, unlike
// buildFirstHeroWinMap above) so it can be shown retroactively wherever
// match history is displayed.
export function buildBadgeCompletionMap(
  rows: FirstHeroWinRow[],
): Map<string, Badge> {
  const byPlayer = new Map<string, FirstHeroWinRow[]>();
  rows.forEach((row) => {
    const list = byPlayer.get(row.player_id) ?? [];
    list.push(row);
    byPlayer.set(row.player_id, list);
  });

  const map = new Map<string, Badge>();
  byPlayer.forEach((playerRows, playerId) => {
    const wonHeroIds = new Set<string>();
    [...playerRows]
      .sort((a, b) => a.match_number - b.match_number)
      .forEach((row) => {
        const matchInfo = Array.isArray(row.matches) ? row.matches[0] : row.matches;
        if (!matchInfo || !row.hero_id) return;
        if (!didWin(row.team, matchInfo.winner)) return;
        const bonus = computeHeroWinBonus(row.hero_id, wonHeroIds);
        if (bonus?.type === "badge") {
          map.set(`${playerId}::${row.match_number}`, bonus.badge);
        }
        wonHeroIds.add(row.hero_id);
      });
  });
  return map;
}

export function getBadgeEarnedInMatch(
  map: Map<string, Badge>,
  playerId: string,
  matchNumber: number,
): Badge | null {
  return map.get(`${playerId}::${matchNumber}`) ?? null;
}

// The badges a player has fully completed, given every hero they've ever
// won at least one match with — order-independent, unlike
// buildBadgeCompletionMap above (which needs to replay chronologically to
// find the one specific match that completed each badge).
export function getCompletedBadges(wonHeroIds: Set<string>): Badge[] {
  return BADGES.filter((badge) =>
    badge.heroIds.every((id) => wonHeroIds.has(id)),
  );
}

// Maps playerId -> every hero they've won at least one match with, across
// their full history.
export function buildWonHeroesByPlayer(
  rows: FirstHeroWinRow[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const matchInfo = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    if (!matchInfo || !row.hero_id) return;
    if (!didWin(row.team, matchInfo.winner)) return;
    const set = map.get(row.player_id) ?? new Set<string>();
    set.add(row.hero_id);
    map.set(row.player_id, set);
  });
  return map;
}

// Maps playerId -> the badges they've fully completed, across their full
// history (not scoped to any one match — see buildBadgeCompletionMap for
// that instead).
export function buildCompletedBadgesMap(
  rows: FirstHeroWinRow[],
): Map<string, Badge[]> {
  const wonHeroesByPlayer = buildWonHeroesByPlayer(rows);
  const map = new Map<string, Badge[]>();
  wonHeroesByPlayer.forEach((wonHeroIds, playerId) => {
    const completed = getCompletedBadges(wonHeroIds);
    if (completed.length > 0) map.set(playerId, completed);
  });
  return map;
}

// Completing a badge no longer carries its own MMR bonus — a
// badge-completing win still gets the ordinary first-win 30% boost above,
// same as any other first win, it just also triggers the badge-earned
// celebration (see computeHeroWinBonus's callers).
export function applyHeroWinBonus(
  mmrChange: number,
  bonus: HeroWinBonus,
): number {
  if (!bonus) return mmrChange;
  return Math.round(mmrChange * FIRST_HERO_WIN_MULTIPLIER);
}
