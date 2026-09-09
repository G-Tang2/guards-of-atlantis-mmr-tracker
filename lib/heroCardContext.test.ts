// Regression coverage for the stat-comparison feature (initiative,
// movement, defense, attack, range, area min/max; hero-scoped and
// cross-hero; color/tier filtering; top-N; named-hero comparisons) and
// the card-mention false-positive fixes. Every expected value here was
// verified against the live app during development (see git history for
// the specific incidents each test guards against) rather than picked
// arbitrarily — a failure means the underlying card database or the
// resolution logic changed in a way that would silently break a real
// user-facing answer.
import { describe, expect, it } from "vitest";
import {
  detectStatSuperlative,
  computeStatExtremes,
  extractAskedLevel,
  detectTopN,
  detectNamedHeroStatComparison,
  computeStatBreakdown,
  wantsCrossHeroStatSummary,
  extractAskedColors,
  getRelevantHeroIds,
  findMentionedCards,
} from "./heroCardContext";

describe("detectStatSuperlative", () => {
  it("detects each stat with a min direction word", () => {
    expect(detectStatSuperlative("lowest initiative")).toEqual({ stat: "initiative", direction: "min" });
    expect(detectStatSuperlative("slowest movement")).toEqual({ stat: "movement", direction: "min" });
    expect(detectStatSuperlative("least defense")).toEqual({ stat: "defense", direction: "min" });
    expect(detectStatSuperlative("smallest attack")).toEqual({ stat: "attack", direction: "min" });
    expect(detectStatSuperlative("shortest range")).toEqual({ stat: "range", direction: "min" });
    expect(detectStatSuperlative("minimum area")).toEqual({ stat: "area", direction: "min" });
  });

  it("detects each stat with a max direction word", () => {
    expect(detectStatSuperlative("highest initiative")).toEqual({ stat: "initiative", direction: "max" });
    expect(detectStatSuperlative("fastest movement")).toEqual({ stat: "movement", direction: "max" });
    expect(detectStatSuperlative("biggest area")).toEqual({ stat: "area", direction: "max" });
    expect(detectStatSuperlative("longest range")).toEqual({ stat: "range", direction: "max" });
  });

  it("returns null with no stat keyword, or a stat keyword with no direction", () => {
    expect(detectStatSuperlative("how do I play Arien")).toBeNull();
    expect(detectStatSuperlative("what is initiative")).toBeNull();
  });
});

describe("computeStatExtremes — initiative", () => {
  it("finds the true minimum RED initiative (7) with all 27 real ties, no false positives", () => {
    // Hit live: the model was given this exact data and still misread
    // it, including an actual-8 card among the "value of 7" matches.
    const groups = computeStatExtremes("initiative", "min", ["RED"]);
    expect(groups).not.toBeNull();
    expect(groups!).toHaveLength(1);
    expect(groups![0].value).toBe(7);
    expect(groups![0].matches).toHaveLength(27);
    expect(groups![0].matches.every((m) => m.color === "RED")).toBe(true);
    expect(groups![0].matches.some((m) => m.cardName === "Mad Dash" && m.heroName === "Brogan the Destroyer")).toBe(
      true,
    );
  });

  it("scopes to only the named hero's own cards, not the whole roster", () => {
    // Hit live: Sabina's "Troop Movement" card leaked her into an
    // Arien-only movement query via a shared word — see the
    // EXTRA_STOP_WORDS fix. This guards the end-to-end scoped result,
    // not just the keyword-matching step.
    const groups = computeStatExtremes("movement", "max", [], ["arien"]);
    expect(groups).not.toBeNull();
    expect(groups![0].matches.every((m) => m.heroName === "Arien the Tidemaster")).toBe(true);
  });
});

describe("computeStatExtremes — other stats resolve the right field", () => {
  it("attack: resolves primaryValue on ATTACK cards, secondaryAttack otherwise", () => {
    const groups = computeStatExtremes("attack", "max", []);
    expect(groups![0].value).toBe(12);
    expect(groups![0].matches).toEqual([
      expect.objectContaining({ heroName: "Emmitt the Traveller", cardName: "Temporal Judgment" }),
    ]);
  });

  it("range: only applies to cards with a RANGE modifier", () => {
    const groups = computeStatExtremes("range", "max", []);
    expect(groups![0].value).toBe(5);
    expect(groups![0].matches.length).toBeGreaterThan(0);
  });

  it("area: only applies to cards with an AREA modifier", () => {
    const groups = computeStatExtremes("area", "max", []);
    expect(groups![0].value).toBe(5);
    expect(groups![0].matches.some((m) => m.cardName === "What the Hell Are You?")).toBe(true);
  });

  it("returns null when no card matches the given filters at all", () => {
    // Tier 99 doesn't exist for any card — a structurally guaranteed
    // empty result, rather than an assumption about which colors happen
    // to have which modifiers (verified live: several colors/levels that
    // looked like plausible "definitely empty" guesses turned out to
    // have real matches).
    const groups = computeStatExtremes("range", "max", [], [], 99);
    expect(groups).toBeNull();
  });
});

describe("computeStatExtremes — level/tier filter", () => {
  it("restricts matches to the requested tier", () => {
    const groups = computeStatExtremes("initiative", "min", ["RED"], [], 1);
    expect(groups).not.toBeNull();
    expect(groups![0].matches.every((m) => m.level === 1)).toBe(true);
  });
});

describe("computeStatExtremes — top N groups", () => {
  it("returns the requested number of distinct values, in the right order", () => {
    const groups = computeStatExtremes("initiative", "min", ["RED"], [], null, 3);
    expect(groups).not.toBeNull();
    expect(groups!.length).toBe(3);
    const values = groups!.map((g) => g.value);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(3);
  });
});

describe("extractAskedLevel", () => {
  it("parses tier/level with digits and roman numerals", () => {
    expect(extractAskedLevel("tier 1 red cards")).toBe(1);
    expect(extractAskedLevel("level 2")).toBe(2);
    expect(extractAskedLevel("tier iii")).toBe(3);
    expect(extractAskedLevel("tier iv")).toBe(4);
    expect(extractAskedLevel("no level mentioned here")).toBeNull();
  });
});

describe("detectTopN", () => {
  it("parses an explicit count and defaults to 1 otherwise", () => {
    expect(detectTopN("top 3 lowest initiative cards")).toBe(3);
    expect(detectTopN("show me the lowest initiative")).toBe(1);
  });

  it("caps at 10 to bound worst-case output size", () => {
    expect(detectTopN("top 500 lowest initiative")).toBe(10);
  });
});

describe("named-hero stat comparison", () => {
  it("detects a compare/vs question naming two heroes with a stat", () => {
    const heroIds = getRelevantHeroIds("Compare Arien and Misa's initiative");
    expect(heroIds).toEqual(expect.arrayContaining(["arien", "misa"]));
    expect(detectNamedHeroStatComparison("Compare Arien and Misa's initiative", heroIds)).toBe("initiative");
  });

  it("does not trigger for a single named hero, even with comparison wording", () => {
    expect(detectNamedHeroStatComparison("Compare Arien's cards", ["arien"])).toBeNull();
  });

  it("computes a per-hero breakdown of real values", () => {
    const breakdown = computeStatBreakdown("initiative", ["arien", "misa"], []);
    expect(breakdown).toHaveLength(2);
    const [arien, misa] = breakdown;
    expect(arien.heroName).toBe("Arien the Tidemaster");
    expect(misa.heroName).toBe("Misa the Samurai");
    expect(arien.cards.length).toBeGreaterThan(0);
    expect(misa.cards.length).toBeGreaterThan(0);
  });
});

describe("wantsCrossHeroStatSummary", () => {
  it("triggers for a cross-hero comparison with no hero already in scope", () => {
    expect(wantsCrossHeroStatSummary("who has the lowest red initiative", [])).toBe(true);
  });

  it("does not trigger once a specific hero is already in scope", () => {
    expect(wantsCrossHeroStatSummary("what's Arien's highest initiative card", ["arien"])).toBe(false);
  });
});

describe("extractAskedColors", () => {
  it("finds a named color as a whole word", () => {
    expect(extractAskedColors("show me the red cards")).toEqual(["RED"]);
    expect(extractAskedColors("how do I play Arien")).toEqual([]);
  });
});

describe("findMentionedCards — false-positive fixes", () => {
  it("doesn't match a card name that's just part of the hero's own display name", () => {
    // Gydion's ultimate is literally named "The Archwizard", the same
    // text in his own display name "Gydion the Archwizard".
    const refs = findMentionedCards("Gydion the Archwizard is versatile.", ["gydion"]);
    expect(refs).toHaveLength(0);
  });

  it("still catches a genuine standalone mention of that same card", () => {
    const refs = findMentionedCards("Gydion's ultimate, The Archwizard, is strong.", ["gydion"]);
    expect(refs.map((r) => r.card.name)).toContain("The Archwizard");
  });

  it("doesn't match a shorter card name that's a prefix of a different, longer card's name", () => {
    // Brogan has both "Shield" and "Shield Bash" as real, distinct cards.
    const refs = findMentionedCards("Brogan can play Shield Bash to great effect.", ["brogan"]);
    expect(refs.map((r) => r.card.name)).toEqual(["Shield Bash"]);
  });

  it("still matches the shorter card when it's genuinely mentioned on its own", () => {
    const refs = findMentionedCards("Brogan's Shield card is solid early.", ["brogan"]);
    expect(refs.map((r) => r.card.name)).toEqual(["Shield"]);
  });

  it("matches both when both are genuinely present", () => {
    const refs = findMentionedCards("Compare Shield and Shield Bash for Brogan.", ["brogan"]);
    expect(refs.map((r) => r.card.name).sort()).toEqual(["Shield", "Shield Bash"]);
  });

  it("still matches a card name ending in punctuation", () => {
    // No \b word-boundary anchors, specifically because of cards like this.
    const refs = findMentionedCards("Mortimer's Braains...! card is fun.", ["mortimer"]);
    expect(refs.map((r) => r.card.name)).toContain("Braains...!");
  });
});
