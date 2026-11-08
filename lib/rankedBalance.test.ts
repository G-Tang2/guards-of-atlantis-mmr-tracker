import { describe, expect, it } from "vitest";
import { rankedBalancedSplits, mmrBalancedSplits, MAX_SKILL_POINT_DIFF } from "@/lib/rankedBalance";

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
    expect(rankedBalancedSplits(pool, 4)).toEqual([]);
  });

  it("still returns balanced options when skill points are close enough", () => {
    // "xi" and "keith" are both hand-assigned 10 points — an even split.
    const pool = [
      { id: "1", name: "Xi", mmr: 1000 },
      { id: "2", name: "Keith", mmr: 1000 },
      { id: "3", name: "Zzz", mmr: 1000 },
      { id: "4", name: "Yyy", mmr: 1000 },
    ];
    const splits = rankedBalancedSplits(pool, 4);
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

describe("rankedBalancedSplits composite weight (skill points nudged by pool-relative MMR)", () => {
  it("breaks a skill-points tie using MMR once both players are unranked", () => {
    // Neither name is in SKILL_RANK_POINTS, so both default to 0 skill
    // points — pure skill weighting would call this a perfectly even
    // (diff 0) split regardless of MMR. Pool average is 1000, so Alice
    // sits +150 MMR above it and Bob -150 below: at the documented 150
    // MMR-per-skill-point rate, that's a +1/-1 nudge each, a real (and
    // correctly detected) diff of 2 instead of 0.
    const pool = [
      { id: "1", name: "Alice", mmr: 1150 },
      { id: "2", name: "Bob", mmr: 850 },
    ];
    const splits = rankedBalancedSplits(pool, 4);
    expect(splits).toHaveLength(1);
  });

  it("rejects a split that's skill-tied but badly MMR-lopsided, where the old skill-only weighting would have allowed it", () => {
    // Same idea, stretched further: a 300/-300 MMR gap around the pool
    // average nudges each side's weight by a full 2 points either way —
    // a 4-point total diff, right at MAX_SKILL_POINT_DIFF's cutoff, so
    // this composite-balanced "tie" is correctly refused rather than
    // offered as a fake "perfectly balanced" split.
    const pool = [
      { id: "1", name: "Alice", mmr: 1300 },
      { id: "2", name: "Bob", mmr: 700 },
    ];
    expect(rankedBalancedSplits(pool, 4)).toEqual([]);
  });

  it("still lets a hand-assigned skill rank dominate a modest MMR gap", () => {
    // "keith" (10) vs "stella" (2) is an 8-point skill gap on its own —
    // already past MAX_SKILL_POINT_DIFF — so a realistic MMR nudge (a few
    // hundred points either way) isn't anywhere near enough to pull this
    // back into range. The hand-curated judgment still wins.
    const pool = [
      { id: "1", name: "Keith", mmr: 700 },
      { id: "2", name: "Stella", mmr: 1300 },
    ];
    expect(rankedBalancedSplits(pool, 4)).toEqual([]);
  });
});
