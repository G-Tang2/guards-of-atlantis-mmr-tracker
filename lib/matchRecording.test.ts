// Regression coverage for computeMatchOutcome — this is the exact pipeline
// that used to live inline in app/matches/new/page.tsx (base Elo, bounty,
// first-hero-win/badge-completion, Devoted/Renowned/Defiant, rookie
// cushion), now shared with the latest-match edit flow in
// app/matches/[id]/page.tsx. Every scenario here hand-derives its expected
// numbers from the same formulas documented in lib/mmr.ts/lib/bounty.ts/
// lib/heroWinBonus.ts/lib/badgeRewards.ts/lib/rookieBonus.ts, so a failure
// here means the computation itself changed, not just this test's own
// assumptions.
import { describe, expect, it } from "vitest";
import { computeMatchOutcome, RosterPlayer } from "./matchRecording";

const player = (id: string, mmr: number): RosterPlayer => ({ id, name: id, mmr, avatarUrl: null });

const emptyInput = {
  heroIdByPlayer: new Map<string, string | null>(),
  wonHeroesByPlayer: new Map<string, Set<string>>(),
  ownedBadgesByPlayer: new Map<string, Set<string>>(),
  bountyHeroIds: new Set<string>(),
  arcaneBountyHeroIds: new Set<string>(),
  rookieInputByPlayer: new Map<string, { matchesPlayedBefore: number; rookieEligible: boolean }>(),
};

describe("computeMatchOutcome — base Elo, no bonuses", () => {
  it("matches the plain Elo formula for an even 1v1 win", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
    });
    // expectedA = 0.5 -> atlantis: (40+10)*(1-0.5) = 25, titans: 40*(0-0.5) = -20.
    expect(result.meta.atlantisDelta).toBe(25);
    expect(result.meta.titansDelta).toBe(-20);
    expect(result.atlantisFinal[0].mmrChange).toBe(25);
    expect(result.atlantisFinal[0].newMmr).toBe(1025);
    expect(result.titansFinal[0].mmrChange).toBe(-20);
    expect(result.titansFinal[0].newMmr).toBe(980);
    expect(result.bountyBonusByPlayer.size).toBe(0);
    expect(result.rookieBonusByPlayer.size).toBe(0);
    expect(result.newlyEarnedBadges).toHaveLength(0);
  });

  it("applies no delta to either side on a draw", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1200)],
      titans: [player("t", 900)],
      winner: "none",
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(0);
    expect(result.titansFinal[0].mmrChange).toBe(0);
  });
});

describe("computeMatchOutcome — bounty bonus", () => {
  it("adds a flat BOUNTY_MMR_BONUS on top of the Elo delta for a bounty hero pick", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      heroIdByPlayer: new Map([["a", "bounty-hero"]]),
      // Already won this hero before, so the first-win bonus below never
      // fires too — isolates the bounty effect on its own.
      wonHeroesByPlayer: new Map([["a", new Set(["bounty-hero"])]]),
      bountyHeroIds: new Set(["bounty-hero"]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(25 + 5);
    expect(result.bountyBonusByPlayer.get("a")).toBe(5);
  });

  it("never awards a bounty bonus on a draw", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "none",
      heroIdByPlayer: new Map([["a", "bounty-hero"]]),
      wonHeroesByPlayer: new Map([["a", new Set(["bounty-hero"])]]),
      bountyHeroIds: new Set(["bounty-hero"]),
    });
    expect(result.bountyBonusByPlayer.size).toBe(0);
  });

  it("uses the boosted Wayward payout instead of the base bounty bonus for its owner", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      heroIdByPlayer: new Map([["a", "bounty-hero"]]),
      wonHeroesByPlayer: new Map([["a", new Set(["bounty-hero"])]]),
      ownedBadgesByPlayer: new Map([["a", new Set(["wayward"])]]),
      bountyHeroIds: new Set(["bounty-hero"]),
    });
    expect(result.bountyBonusByPlayer.get("a")).toBe(7);
    expect(result.atlantisFinal[0].mmrChange).toBe(25 + 7);
  });
});

describe("computeMatchOutcome — first hero win / badge completion", () => {
  it("boosts a first-ever win with a hero by 30%, rounded", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      heroIdByPlayer: new Map([["a", "misa"]]),
      wonHeroesByPlayer: new Map([["a", new Set()]]),
    });
    // 25 * 1.3 = 32.5 -> rounds to 33.
    expect(result.atlantisFinal[0].mmrChange).toBe(33);
    expect(result.newlyEarnedBadges).toHaveLength(0);
  });

  it("never grants the first-win boost on a loss", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "titans",
      heroIdByPlayer: new Map([["a", "misa"]]),
      wonHeroesByPlayer: new Map([["a", new Set()]]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(-20);
  });

  it("flags a newly completed badge and still applies only the ordinary first-win boost", () => {
    // Base badge: arien, brogan, dodger, tigerclaw, wasp, sabina, xargatha —
    // every hero but xargatha already won; winning with xargatha now
    // completes it.
    const priorWins = new Set(["arien", "brogan", "dodger", "tigerclaw", "wasp", "sabina"]);
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      heroIdByPlayer: new Map([["a", "xargatha"]]),
      wonHeroesByPlayer: new Map([["a", priorWins]]),
    });
    expect(result.newlyEarnedBadges).toHaveLength(1);
    expect(result.newlyEarnedBadges[0]).toMatchObject({ playerId: "a", badge: { id: "base" } });
    expect(result.atlantisFinal[0].mmrChange).toBe(33);
  });
});

describe("computeMatchOutcome — Devoted/Renowned/Defiant badge rewards", () => {
  it("adds the Renowned win bonus on top of everything else", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      ownedBadgesByPlayer: new Map([["a", new Set(["renowned"])]]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(25 + 2);
    expect(result.badgeBonusesByPlayer.get("a")?.renowned).toBe(2);
  });

  it("softens a Devoted owner's loss by up to 3", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "titans",
      ownedBadgesByPlayer: new Map([["a", new Set(["devoted"])]]),
    });
    // Base loss delta is -20; Devoted softens it by 3.
    expect(result.atlantisFinal[0].mmrChange).toBe(-20 + 3);
  });
});

describe("computeMatchOutcome — rookie cushion", () => {
  it("adds the flat rookie bonus for an eligible new player regardless of other bonuses", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      rookieInputByPlayer: new Map([["a", { matchesPlayedBefore: 0, rookieEligible: true }]]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(25 + 100);
    expect(result.rookieBonusByPlayer.get("a")).toBe(100);
  });

  it("does not apply once a rookie-eligible player has reached the match threshold", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      rookieInputByPlayer: new Map([["a", { matchesPlayedBefore: 3, rookieEligible: true }]]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(25);
    expect(result.rookieBonusByPlayer.size).toBe(0);
  });

  it("does not apply to a low-matches player who isn't flagged rookie_eligible", () => {
    const result = computeMatchOutcome({
      ...emptyInput,
      atlantis: [player("a", 1000)],
      titans: [player("t", 1000)],
      winner: "atlantis",
      rookieInputByPlayer: new Map([["a", { matchesPlayedBefore: 0, rookieEligible: false }]]),
    });
    expect(result.atlantisFinal[0].mmrChange).toBe(25);
  });
});
