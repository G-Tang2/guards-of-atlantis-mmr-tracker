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
const DEFIANT_TEAM_BONUS = 1;

export type BadgeRewardBonuses = {
  devoted?: number; // magnitude actually softened off the loss (<= 3)
  renowned?: number; // flat amount added on a win (2 if applied)
  defiant?: number; // signed amount applied (+ on the owner's own win, - on the opponents' win)
};

// Applies the Renowned/Devoted/Defiant badge rewards on top of results
// that already have the bounty bonus and first-hero-win/badge-completion
// multiplier folded in (see app/matches/new/page.tsx) — this must run
// last, since Defiant is the only cross-team effect and needs to see
// everyone's otherwise-final numbers.
//
// `ownedBadgesByPlayer` must reflect badges completed strictly BEFORE
// this match (see getCompletedBadges/buildWonHeroesByPlayer in
// lib/heroWinBonus.ts) — a badge this very match's win completes doesn't
// grant its reward yet, same rule the rest of the badge system already
// follows.
//
// Draws (winner === "none") aren't a win for either team, so Renowned
// (win-only) never applies on a draw; Devoted/Defiant's loss-side effects
// already only fire on an actual loss, so they're unaffected.
export function applyBadgeRewards(
  atlantisResults: PlayerResult[],
  titansResults: PlayerResult[],
  winner: Team,
  ownedBadgesByPlayer: Map<string, Set<string>>,
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

  // Renowned (win) / Devoted (loss) — per-player, own team only.
  const applyOwnTeam = (team: Team, results: PlayerResult[]): PlayerResult[] => {
    const won = didWin(team, winner);
    return results.map((p) => {
      if (won && owns(p.id, "renowned")) {
        addBonus(p.id, { renowned: RENOWNED_WIN_BONUS });
        return {
          ...p,
          mmrChange: p.mmrChange + RENOWNED_WIN_BONUS,
          newMmr: p.newMmr + RENOWNED_WIN_BONUS,
        };
      }
      if (!won && owns(p.id, "devoted") && p.mmrChange < 0) {
        const reduction = Math.min(DEVOTED_LOSS_REDUCTION, -p.mmrChange);
        addBonus(p.id, { devoted: reduction });
        return {
          ...p,
          mmrChange: p.mmrChange + reduction,
          newMmr: p.newMmr + reduction,
        };
      }
      return p;
    });
  };

  let atlantis = applyOwnTeam("atlantis", atlantisResults);
  let titans = applyOwnTeam("titans", titansResults);

  // Defiant — cross-team, applied last so it sees the fully-settled
  // numbers from every other effect above.
  const countDefiantOwners = (results: PlayerResult[]) =>
    results.filter((p) => owns(p.id, "defiant")).length;

  const atlantisWon = didWin("atlantis", winner);
  const titansWon = didWin("titans", winner);

  // Only a genuine win/loss (not a draw, where neither side reads as won)
  // has a winning and a losing side for Defiant's cross-team effect to
  // apply between.
  if (atlantisWon !== titansWon) {
    const winningIsAtlantis = atlantisWon;
    const winningResults = winningIsAtlantis ? atlantis : titans;
    const losingResults = winningIsAtlantis ? titans : atlantis;

    const ownOwners = countDefiantOwners(winningResults);
    const opponentOwners = countDefiantOwners(losingResults);
    const netPerPlayer = (ownOwners - opponentOwners) * DEFIANT_TEAM_BONUS;

    if (netPerPlayer !== 0) {
      const adjusted = winningResults.map((p) => {
        addBonus(p.id, { defiant: netPerPlayer });
        return {
          ...p,
          mmrChange: p.mmrChange + netPerPlayer,
          newMmr: p.newMmr + netPerPlayer,
        };
      });
      if (winningIsAtlantis) atlantis = adjusted;
      else titans = adjusted;
    }
  }

  return { atlantis, titans, bonuses };
}
