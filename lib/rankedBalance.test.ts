import { describe, expect, it } from "vitest";
import { rankedBalancedSplits, mmrBalancedSplits, fitExpectedMmrBySkill, MAX_SKILL_POINT_DIFF, SkillMmrFit } from "@/lib/rankedBalance";

// A flat fit (every skill tier "expected" at the same MMR) — used by
// tests in the first describe block below, where every player actually
// sits at that same MMR too, so the composite weight's MMR residual is
// always exactly 0 and these behave exactly like the pre-composite,
// skill-points-only splitter.
const FLAT_FIT: SkillMmrFit = { slope: 0, intercept: 1000 };

describe("mmrBalancedSplits", () => {
  // 4 players, MMR chosen so all 3 possible 2-vs-2 partitions have a
  // distinct, hand-computable difference:
  //   a=1000 b=900 c=800 d=1200 (total 3900)
  //   {c,d} vs {a,b}: |2000-1900| = 100
  //   {b,d} vs {a,c}: |2100-1800| = 300
  //   {b,c} vs {a,d}: |1700-2200| = 500
  // With only 3 possible partitions total, every pair of players ends up
  // together in exactly one of them — nowhere near the diversity cap — so
  // which 3 (or fewer) get returned, and their order, come down purely to
  // the plain diff ranking, with no diversity trade-off to also verify by
  // hand here (that's covered qualitatively by the "many options" test
  // below instead, which doesn't try to predict the exact combination).
  const pool = [
    { id: "a", name: "Alice", mmr: 1000 },
    { id: "b", name: "Bob", mmr: 900 },
    { id: "c", name: "Cara", mmr: 800 },
    { id: "d", name: "Dan", mmr: 1200 },
  ];
  const idsOf = (players: { id: string }[]) => players.map((p) => p.id);

  it("returns every possible split when count covers them all, most balanced first", () => {
    const splits = mmrBalancedSplits(pool, 3);
    expect(splits).toHaveLength(3);

    expect(idsOf(splits[0].atlantis)).toEqual(["c", "d"]);
    expect(idsOf(splits[0].titans)).toEqual(["a", "b"]);

    expect(idsOf(splits[1].atlantis)).toEqual(["b", "d"]);
    expect(idsOf(splits[1].titans)).toEqual(["a", "c"]);

    expect(idsOf(splits[2].atlantis)).toEqual(["b", "c"]);
    expect(idsOf(splits[2].titans)).toEqual(["a", "d"]);
  });

  it("keeps only the most-balanced options when count is less than every possibility", () => {
    const splits = mmrBalancedSplits(pool, 2);
    expect(splits).toHaveLength(2);
    expect(idsOf(splits[0].atlantis)).toEqual(["c", "d"]);
    expect(idsOf(splits[1].atlantis)).toEqual(["b", "d"]);
  });

  it("asks for more splits than exist and gets however many are actually possible", () => {
    // Pool[0] (a) is fixed to titans by convention, so with only 2 players
    // there's exactly one possible split, no matter how many are asked for.
    const twoPlayers = [
      { id: "a", name: "Alice", mmr: 2000 },
      { id: "b", name: "Bob", mmr: 100 },
    ];
    const splits = mmrBalancedSplits(twoPlayers, 4);
    expect(splits).toEqual([{ atlantis: [twoPlayers[1]], titans: [twoPlayers[0]] }]);
  });

  it("never comes back empty for 2+ players, unlike the skill-capped ranked splitter", () => {
    // A single 1v1 is always "possible" for a plain MMR balance, no matter
    // how lopsided — there's no threshold to gate on.
    const lopsided = [
      { id: "a", name: "Alice", mmr: 2000 },
      { id: "b", name: "Bob", mmr: 100 },
    ];
    expect(mmrBalancedSplits(lopsided, 4)).toHaveLength(1);
  });

  it("handles a larger pool (8 players) without erroring, with every split staying within 1 of an even team size", () => {
    const bigPool = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
      mmr: 800 + i * 37,
    }));
    const splits = mmrBalancedSplits(bigPool, 4);
    expect(splits.length).toBeGreaterThan(0);
    expect(splits.length).toBeLessThanOrEqual(4);
    splits.forEach((split) => {
      expect(Math.abs(split.atlantis.length - split.titans.length)).toBeLessThanOrEqual(1);
      expect(split.atlantis.length + split.titans.length).toBe(8);
    });
  });

  it("regression: always includes the single best split, even when that costs pairing diversity", () => {
    // Real 8-player MMR data where the true best 2-vs-2-vs-2-vs-2... err,
    // 4-vs-4 split (diff 3) shares enough pairs with the next-best options
    // that the old pair-diversity cap (inherited from rankedBalancedSplits,
    // tuned for skill points' small, heavily-clustered integer scale) threw
    // it away entirely and settled for four much worse options (diffs
    // 17/55/109/147, total 328) instead of the four genuinely best ones
    // (diffs 3/17/17/17, total 54). mmrBalancedSplits must never trade the
    // actual best option away for variety — see its own comment.
    const pool = [
      { id: "a", name: "Adrian", mmr: 1162 },
      { id: "b", name: "Amy", mmr: 995 },
      { id: "c", name: "Bao", mmr: 1080 },
      { id: "d", name: "Cathy", mmr: 976 },
      { id: "e", name: "Dave", mmr: 913 },
      { id: "f", name: "Eddy", mmr: 1172 },
      { id: "g", name: "Ellie", mmr: 959 },
      { id: "h", name: "Garvin", mmr: 1172 },
    ];
    const diffOf = (split: { atlantis: { mmr: number }[]; titans: { mmr: number }[] }) =>
      Math.abs(
        split.atlantis.reduce((s, p) => s + p.mmr, 0) - split.titans.reduce((s, p) => s + p.mmr, 0),
      );

    const splits = mmrBalancedSplits(pool, 4);
    const diffs = splits.map(diffOf).sort((a, b) => a - b);
    expect(diffs[0]).toBe(3);
    expect(diffs).toEqual([3, 17, 17, 17]);
  });
});

describe("rankedBalancedSplits (regression after extracting the shared weighted-split core)", () => {
  // Every player sits at the pool's own average MMR in this describe block
  // (unless a test says otherwise), so the composite weight's MMR nudge is
  // always exactly 0 and these behave exactly like the pre-composite,
  // skill-points-only splitter — isolating these from the new MMR-blending
  // behavior, which gets its own describe block below.
  it("still gates on MAX_SKILL_POINT_DIFF — a 10-vs-0 skill gap returns no options", () => {
    // "keith" is hand-assigned 10 skill points; an unrecognized name
    // defaults to 0 (see skillPointsOf) — a 10-point gap is well past
    // MAX_SKILL_POINT_DIFF, so there's no split to offer at all.
    const pool = [
      { id: "1", name: "Keith", mmr: 1000 },
      { id: "2", name: "Zzz", mmr: 1000 },
    ];
    expect(rankedBalancedSplits(pool, 4, FLAT_FIT)).toEqual([]);
  });

  it("still returns balanced options when skill points are close enough", () => {
    // "xi" and "keith" are both hand-assigned 10 points — an even split.
    const pool = [
      { id: "1", name: "Xi", mmr: 1000 },
      { id: "2", name: "Keith", mmr: 1000 },
      { id: "3", name: "Zzz", mmr: 1000 },
      { id: "4", name: "Yyy", mmr: 1000 },
    ];
    const splits = rankedBalancedSplits(pool, 4, FLAT_FIT);
    expect(splits.length).toBeGreaterThan(0);
    splits.forEach((split) => {
      expect(Math.abs(split.atlantis.length - split.titans.length)).toBeLessThanOrEqual(1);
    });
  });

  it("MAX_SKILL_POINT_DIFF is still a small, single-digit threshold", () => {
    // Sanity check that the constant itself survived the refactor
    // unchanged, not just its effect.
    expect(MAX_SKILL_POINT_DIFF).toBe(4);
  });
});

describe("rankedBalancedSplits composite weight (skill points nudged by skill-tier-relative MMR)", () => {
  // expectedMmr(skill) = 20*skill + 1000, so skill 0 (unranked) expects
  // 1000 and skill 10 expects 1200 — a fit the tests below pick deviations
  // against directly, rather than relying on an implicit pool average.
  const fit: SkillMmrFit = { slope: 20, intercept: 1000 };

  it("breaks a skill-points tie using MMR once both players are unranked", () => {
    // Neither name is in SKILL_RANK_POINTS, so both default to 0 skill
    // points, whose expected MMR is the fit's flat intercept (1000) —
    // pure skill weighting would call this a perfectly even (diff 0)
    // split regardless of MMR. Alice sits +150 MMR above that and Bob
    // -150 below: at the documented 100 MMR-per-skill-point rate, that's
    // a +1.5/-1.5 nudge each, a real (and correctly detected) diff of 3
    // instead of 0.
    const pool = [
      { id: "1", name: "Alice", mmr: 1150 },
      { id: "2", name: "Bob", mmr: 850 },
    ];
    const splits = rankedBalancedSplits(pool, 4, fit);
    expect(splits).toHaveLength(1);
  });

  it("rejects a split that's skill-tied but badly MMR-lopsided, where the old skill-only weighting would have allowed it", () => {
    // Same idea, stretched further: a 300/-300 MMR gap around their
    // shared expected MMR (1000, both unranked) nudges each side's weight
    // by a full 3 points either way — a 6-point total diff, well past
    // MAX_SKILL_POINT_DIFF's cutoff of 4, so this composite-balanced "tie"
    // is correctly refused rather than offered as a fake "perfectly
    // balanced" split.
    const pool = [
      { id: "1", name: "Alice", mmr: 1300 },
      { id: "2", name: "Bob", mmr: 700 },
    ];
    expect(rankedBalancedSplits(pool, 4, fit)).toEqual([]);
  });

  it("still lets a hand-assigned skill rank dominate a genuinely modest MMR disagreement", () => {
    // "keith" (10) vs "stella" (2) is an 8-point skill gap on its own —
    // already past MAX_SKILL_POINT_DIFF. Their expected MMRs under `fit`
    // are 1200 and 1040; Keith sits 150 below his (underperforming) and
    // Stella 150 above hers (overperforming), nudging each by ∓1.5 and
    // narrowing the gap to 5 — still over the cutoff, so the hand-curated
    // judgment still wins here.
    const pool = [
      { id: "1", name: "Keith", mmr: 1050 },
      { id: "2", name: "Stella", mmr: 1190 },
    ];
    expect(rankedBalancedSplits(pool, 4, fit)).toEqual([]);
  });

  it("lets a big enough MMR disagreement override even a large skill gap — the real tradeoff of a smaller MMR_POINTS_PER_SKILL_POINT", () => {
    // Same 8-point skill gap as above, but stretched to a ±300 MMR
    // disagreement from each one's own expected MMR (Keith underperforming
    // his rank, Stella overperforming hers) — at the 100 MMR-per-skill-
    // point rate that's a ∓3 nudge each, narrowing the 8-point skill gap
    // to 2, which now clears MAX_SKILL_POINT_DIFF. Unlike the modest case
    // above, here the hand-curated judgment is overridden.
    const pool = [
      { id: "1", name: "Keith", mmr: 900 },
      { id: "2", name: "Stella", mmr: 1340 },
    ];
    expect(rankedBalancedSplits(pool, 4, fit)).toHaveLength(1);
  });
});

describe("fitExpectedMmrBySkill", () => {
  it("fits a clean line through a sample with an exact linear relationship", () => {
    // skill 10 -> 1200, skill 2 -> 1040: a perfect line of slope 20,
    // intercept 1000 (y = 20x + 1000) through these two points.
    const fit = fitExpectedMmrBySkill([
      { name: "Keith", mmr: 1200, matchesPlayed: 10 },
      { name: "Stella", mmr: 1040, matchesPlayed: 10 },
    ]);
    expect(fit.slope).toBeCloseTo(20);
    expect(fit.intercept).toBeCloseTo(1000);
  });

  it("excludes unranked players — they're not a real 'skill 0' data point", () => {
    // "Zzz" isn't in SKILL_RANK_POINTS at all; if it were included at
    // skill 0, it would drag the fit toward a flatter line. With it
    // correctly excluded, this is the same clean 2-point fit as above.
    const fit = fitExpectedMmrBySkill([
      { name: "Keith", mmr: 1200, matchesPlayed: 10 },
      { name: "Stella", mmr: 1040, matchesPlayed: 10 },
      { name: "Zzz", mmr: 1, matchesPlayed: 10 },
    ]);
    expect(fit.slope).toBeCloseTo(20);
    expect(fit.intercept).toBeCloseTo(1000);
  });

  it("excludes players below the matches-played floor", () => {
    // Same as above, but Stella's sample row hasn't played enough games
    // yet — her still-noisy MMR shouldn't be allowed to skew the fit.
    const fit = fitExpectedMmrBySkill([
      { name: "Keith", mmr: 1200, matchesPlayed: 10 },
      { name: "Stella", mmr: 99999, matchesPlayed: 1 },
    ]);
    expect(fit.slope).toBe(0);
    expect(fit.intercept).toBe(1200);
  });

  it("falls back to a flat read of the sample's own average when only one skill tier qualifies", () => {
    const fit = fitExpectedMmrBySkill([
      { name: "Keith", mmr: 1100, matchesPlayed: 10 },
      { name: "Garvin", mmr: 1300, matchesPlayed: 10 },
    ]);
    expect(fit.slope).toBe(0);
    expect(fit.intercept).toBe(1200);
  });

  it("returns a flat zero fit for an empty or fully-disqualified sample", () => {
    expect(fitExpectedMmrBySkill([])).toEqual({ slope: 0, intercept: 0 });
    expect(
      fitExpectedMmrBySkill([{ name: "Zzz", mmr: 1500, matchesPlayed: 50 }]),
    ).toEqual({ slope: 0, intercept: 0 });
  });
});
