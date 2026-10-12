// The one place the actual "what does this match's result mean for every
// participant's MMR" pipeline lives — base Elo, bounty, first-hero-win/
// badge-completion, Devoted/Renowned/Defiant, then rookie cushion, in that
// exact order (each stage's own comment below explains why the order
// matters). Originally inline in app/matches/new/page.tsx; extracted so
// editing the latest match (see app/matches/[id]/page.tsx) can recompute a
// corrected result through the identical logic instead of a second,
// drift-prone copy of it. Deliberately pure — every external fact it needs
// (hero-win history, bounty eligibility, rookie status) is passed in
// already resolved, so neither caller has to agree on how to fetch any of
// it, just on what "before this match" means for their own situation (a
// fresh insert vs. an edit of the match that already holds that title).
import { calculateMMR, Player as MmrPlayer, PlayerResult } from "@/lib/mmr";
import { BOUNTY_MMR_BONUS, WAYWARD_BOUNTY_MMR_BONUS } from "@/lib/bounty";
import { isRookie, ROOKIE_MMR_BONUS } from "@/lib/rookieBonus";
import { computeHeroWinBonus, applyHeroWinBonus } from "@/lib/heroWinBonus";
import { applyBadgeRewards, BadgeRewardBonuses } from "@/lib/badgeRewards";
import { didWin, Team } from "@/lib/match";
import { EarnedBadgeInfo } from "@/components/BadgeEarnedOverlay";

export type RosterPlayer = {
  id: string;
  name: string;
  mmr: number; // mmr_before — this player's MMR going into this match.
  avatarUrl?: string | null;
};

export type MatchComputationInput = {
  atlantis: RosterPlayer[];
  titans: RosterPlayer[];
  winner: "atlantis" | "titans" | "none";
  heroIdByPlayer: Map<string, string | null>;
  // Every participant's hero-win history from *before* this match. A fresh
  // recording gets this for free (the match doesn't exist in the DB yet
  // when the query runs); an edit of an already-recorded match has to
  // explicitly exclude that match's own rows to get the same "before"
  // view — see recomputeLatestMatch's own comment.
  wonHeroesByPlayer: Map<string, Set<string>>;
  ownedBadgesByPlayer: Map<string, Set<string>>;
  bountyHeroIds: Set<string>;
  arcaneBountyHeroIds: Set<string>;
  // matches_played and rookie_eligible as of *before* this match.
  rookieInputByPlayer: Map<string, { matchesPlayedBefore: number; rookieEligible: boolean }>;
};

export type MatchComputationResult = {
  atlantisFinal: PlayerResult[];
  titansFinal: PlayerResult[];
  meta: {
    atlantisAvg: number;
    titansAvg: number;
    expectedA: number;
    atlantisDelta: number;
    titansDelta: number;
  };
  bountyBonusByPlayer: Map<string, number>;
  rookieBonusByPlayer: Map<string, number>;
  badgeBonusesByPlayer: Map<string, BadgeRewardBonuses>;
  newlyEarnedBadges: EarnedBadgeInfo[];
};

export function computeMatchOutcome(input: MatchComputationInput): MatchComputationResult {
  const { atlantis, titans, winner, heroIdByPlayer, wonHeroesByPlayer, ownedBadgesByPlayer, bountyHeroIds, arcaneBountyHeroIds, rookieInputByPlayer } = input;

  const toMmrPlayer = (p: RosterPlayer): MmrPlayer => ({ id: p.id, name: p.name, mmr: p.mmr });
  const atlMmrPlayers = atlantis.map(toMmrPlayer);
  const titMmrPlayers = titans.map(toMmrPlayer);

  const result = calculateMMR(atlMmrPlayers, titMmrPlayers, winner);

  // A bounty hero is one nobody has played recently — picking one awards a
  // flat bonus on top of the normal Elo delta, regardless of whether the
  // match was won or lost, but never on a draw, since neither side "won" it.
  const bountyBonusByPlayer = new Map<string, number>();
  const applyBounty = (list: PlayerResult[]): PlayerResult[] =>
    list.map((p) => {
      const heroId = heroIdByPlayer.get(p.id);
      if (!heroId || winner === "none") return p;
      const ownedBadges = ownedBadgesByPlayer.get(p.id);
      const isBounty =
        bountyHeroIds.has(heroId) ||
        (ownedBadges?.has("arcane") && arcaneBountyHeroIds.has(heroId));
      if (!isBounty) return p;
      const bonusAmount = ownedBadges?.has("wayward") ? WAYWARD_BOUNTY_MMR_BONUS : BOUNTY_MMR_BONUS;
      bountyBonusByPlayer.set(p.id, bonusAmount);
      return { ...p, mmrChange: p.mmrChange + bonusAmount, newMmr: p.newMmr + bonusAmount };
    });

  const atlantisResults = applyBounty(result.atlantis);
  const titansResults = applyBounty(result.titans);

  // First win with a hero grants a 30% MMR boost (on top of any bounty
  // bonus already folded in above); if that win also completes a badge, a
  // flat +50 replaces the 30% boost rather than stacking with it. A draw
  // isn't a win for either side, so it never grants this.
  const newlyEarnedBadges: EarnedBadgeInfo[] = [];
  const rosterById = new Map([...atlantis, ...titans].map((p) => [p.id, p]));
  const teamOf = (playerId: string): Team => (atlantis.some((p) => p.id === playerId) ? "atlantis" : "titans");
  const applyHeroBonus = (list: PlayerResult[]): PlayerResult[] =>
    list.map((p) => {
      const heroId = heroIdByPlayer.get(p.id);
      if (!heroId || !didWin(teamOf(p.id), winner)) return p;

      const bonus = computeHeroWinBonus(heroId, wonHeroesByPlayer.get(p.id) ?? new Set());
      if (!bonus) return p;

      if (bonus.type === "badge") {
        const roster = rosterById.get(p.id);
        newlyEarnedBadges.push({
          playerId: p.id,
          playerName: p.name,
          playerAvatar: roster?.avatarUrl,
          badge: bonus.badge,
        });
      }

      const boostedChange = applyHeroWinBonus(p.mmrChange, bonus);
      return { ...p, newMmr: p.newMmr + (boostedChange - p.mmrChange), mmrChange: boostedChange };
    });

  const atlantisAfterHeroBonus = applyHeroBonus(atlantisResults);
  const titansAfterHeroBonus = applyHeroBonus(titansResults);

  // Renowned/Devoted/Defiant — must run last (before the rookie cushion),
  // since Defiant is the only cross-team effect and needs to see
  // everyone's otherwise-final numbers.
  const badgeRewards = applyBadgeRewards(atlantisAfterHeroBonus, titansAfterHeroBonus, winner, ownedBadgesByPlayer);

  // A genuinely new player still within their first few matches gets a
  // flat MMR cushion, unaffected by any of the multiplicative bonuses
  // above — applied last so it's always exactly ROOKIE_MMR_BONUS on top of
  // whatever this match otherwise gave them, win, lose, or draw.
  const rookieBonusByPlayer = new Map<string, number>();
  const applyRookieBonus = (list: PlayerResult[]): PlayerResult[] =>
    list.map((p) => {
      const rookieInput = rookieInputByPlayer.get(p.id);
      if (!isRookie(rookieInput?.matchesPlayedBefore ?? 0, rookieInput?.rookieEligible ?? false)) return p;
      rookieBonusByPlayer.set(p.id, ROOKIE_MMR_BONUS);
      return { ...p, mmrChange: p.mmrChange + ROOKIE_MMR_BONUS, newMmr: p.newMmr + ROOKIE_MMR_BONUS };
    });

  const atlantisFinal = applyRookieBonus(badgeRewards.atlantis);
  const titansFinal = applyRookieBonus(badgeRewards.titans);

  return {
    atlantisFinal,
    titansFinal,
    meta: result.meta,
    bountyBonusByPlayer,
    rookieBonusByPlayer,
    badgeBonusesByPlayer: badgeRewards.bonuses,
    newlyEarnedBadges,
  };
}
