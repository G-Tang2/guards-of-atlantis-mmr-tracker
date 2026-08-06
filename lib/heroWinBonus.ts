import { Badge, BADGES } from "@/lib/badges";

// Winning with a hero for the first time boosts that match's MMR gain by
// 30% (stacks with the bounty bonus, since it's applied on top of the
// already-bounty-adjusted change). If that same win also completes a badge
// (every hero in the badge now has a win), a flat +50 MMR is added on top of
// the 30%-boosted amount — the +50 itself is flat and doesn't get multiplied
// in, it just doesn't "stack" in the sense of compounding with the 30%.
export const FIRST_HERO_WIN_MULTIPLIER = 1.3;
export const BADGE_COMPLETE_MMR_BONUS = 50;

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

export function applyHeroWinBonus(
  mmrChange: number,
  bonus: HeroWinBonus,
): number {
  if (!bonus) return mmrChange;
  const boosted = Math.round(mmrChange * FIRST_HERO_WIN_MULTIPLIER);
  if (bonus.type === "badge") return boosted + BADGE_COMPLETE_MMR_BONUS;
  return boosted;
}
