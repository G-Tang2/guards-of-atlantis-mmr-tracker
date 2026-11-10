import { PlayerResult } from "@/lib/mmr";
import { Team, didWin } from "@/lib/match";
import { getCompletedBadges } from "@/lib/heroWinBonus";

// Thin wrapper over getCompletedBadges (lib/heroWinBonus.ts) — callers of
// applyBadgeRewards below just need the ids, not the full Badge objects.
export function getOwnedBadgeIds(wonHeroIds: Set<string>): Set<string> {
  return new Set(getCompletedBadges(wonHeroIds).map((b) => b.id));
}

const DEVOTED_LOSS_REDUCTION = 3;
const RENOWNED_WIN_BONUS = 2;
export const DEFIANT_BET_AMOUNT = 5;

export type BadgeRewardBonuses = {
  devoted?: number; // magnitude actually softened off the loss (<= 3)
  renowned?: number; // flat amount added on a win (2 if applied)
  defiant?: number; // signed bet result (+5 if their bet won, -5 if it lost)
};

// Applies the Renowned/Devoted/Defiant badge rewards on top of results
// that already have the bounty bonus and first-hero-win/badge-completion
// multiplier folded in (see app/matches/new/page.tsx) — this runs after
// those, so each one stacks on an otherwise-final number, but (unlike
// when Defiant was a cross-team effect) nothing here depends on seeing
// both teams' numbers at once anymore.
//
// `ownedBadgesByPlayer` must reflect badges completed strictly BEFORE
// this match (see getCompletedBadges/buildWonHeroesByPlayer in
// lib/heroWinBonus.ts) — a badge this very match's win completes doesn't
// grant its reward yet, same rule the rest of the badge system already
// follows.
//
// Draws (winner === "none") aren't a win for either team, so Renowned
// (win-only) never applies on a draw; Devoted/Defiant's loss-side effects
// already only fire on an actual loss, so they're unaffected. Defiant's
// bet is simply void on a draw — see its own check below.
//
// `defiantBetPlayerIds` is who actually chose to place their bet for this
// specific match (see the "Place Defiant bet?" checkbox in
// app/matches/new/page.tsx and app/matches/[id]/page.tsx's edit form) —
// owning the badge only makes someone *eligible* to bet, it isn't itself
// a standing wager every match the way Renowned/Devoted are.
export function applyBadgeRewards(
  atlantisResults: PlayerResult[],
  titansResults: PlayerResult[],
  winner: Team,
  ownedBadgesByPlayer: Map<string, Set<string>>,
  defiantBetPlayerIds: Set<string> = new Set(),
): {
  atlantis: PlayerResult[];
  titans: PlayerResult[];
  bonuses: Map<string, BadgeRewardBonuses>;
} {
  const owns = (playerId: string, badgeId: string) =>
    ownedBadgesByPlayer.get(playerId)?.has(badgeId) ?? false;

  const bonuses = new Map<string, BadgeRewardBonuses>();
  const addBonus = (playerId: string, patch: BadgeRewardBonuses) => {
    bonuses.set(playerId, { ...bonuses.get(playerId), ...patch });
  };

  const isDraw = winner === "none";

  // Renowned (win) / Devoted (loss) / Defiant (bet), all per-player.
  const applyOwnTeam = (team: Team, results: PlayerResult[]): PlayerResult[] => {
    const won = didWin(team, winner);
    return results.map((p) => {
      if (won && owns(p.id, "renowned")) {
        addBonus(p.id, { renowned: RENOWNED_WIN_BONUS });
        p = { ...p, mmrChange: p.mmrChange + RENOWNED_WIN_BONUS, newMmr: p.newMmr + RENOWNED_WIN_BONUS };
      }
      if (!won && owns(p.id, "devoted") && p.mmrChange < 0) {
        const reduction = Math.min(DEVOTED_LOSS_REDUCTION, -p.mmrChange);
        addBonus(p.id, { devoted: reduction });
        p = { ...p, mmrChange: p.mmrChange + reduction, newMmr: p.newMmr + reduction };
      }
      if (!isDraw && owns(p.id, "defiant") && defiantBetPlayerIds.has(p.id)) {
        const betResult = won ? DEFIANT_BET_AMOUNT : -DEFIANT_BET_AMOUNT;
        addBonus(p.id, { defiant: betResult });
        p = { ...p, mmrChange: p.mmrChange + betResult, newMmr: p.newMmr + betResult };
      }
      return p;
    });
  };

  const atlantis = applyOwnTeam("atlantis", atlantisResults);
  const titans = applyOwnTeam("titans", titansResults);

  return { atlantis, titans, bonuses };
}
