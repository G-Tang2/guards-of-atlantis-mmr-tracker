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
  detectOrdinalRank,
  ordinalRankWord,
  detectNamedHeroStatComparison,
  computeStatBreakdown,
  wantsCrossHeroStatSummary,
  extractAskedColors,
  getRelevantHeroIds,
  findMentionedCards,
  auditDistinctiveKeywords,
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

  it("keeps a cross-hero color-filtered query scoped to the whole roster", () => {
    // Hit live: "Show me the green cards with the lowest initiative"
    // came back scoped to only Bain, because his card text contains the
    // icon token "::movement_green::" and "green" got extracted as a
    // standalone keyword from inside it — see the EXTRA_STOP_WORDS fix.
    const heroIds = getRelevantHeroIds("Show me the green cards with the lowest initiative");
    expect(heroIds).toEqual([]);
    const groups = computeStatExtremes("initiative", "min", ["GREEN"], heroIds);
    expect(groups).not.toBeNull();
    expect(new Set(groups![0].matches.map((m) => m.heroName)).size).toBeGreaterThan(1);
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

describe("detectOrdinalRank", () => {
  it("parses ordinal words and numeric suffixes, min 2", () => {
    expect(detectOrdinalRank("second highest attack")).toBe(2);
    expect(detectOrdinalRank("2nd highest attack")).toBe(2);
    expect(detectOrdinalRank("third lowest initiative")).toBe(3);
    expect(detectOrdinalRank("3rd-lowest initiative")).toBe(3);
  });

  it("returns null for the plain highest/lowest case and for top-N phrasing", () => {
    expect(detectOrdinalRank("highest attack")).toBeNull();
    expect(detectOrdinalRank("top 3 highest attack")).toBeNull();
  });
});

describe("ordinalRankWord", () => {
  it("spells out known ranks and falls back to a numeric suffix beyond that", () => {
    expect(ordinalRankWord(2)).toBe("second");
    expect(ordinalRankWord(10)).toBe("tenth");
    expect(ordinalRankWord(11)).toBe("11th");
  });
});

describe("computeStatExtremes — narrowing to one ordinal rank", () => {
  it("resolves 'second highest attack for tier 1 red cards' to the real second-place value (6), not the reported wrong answer (7)", () => {
    // Hit live: the model answered "7" for this exact question — a value
    // that appears nowhere in this data — because nothing upstream told
    // it which value was actually second place, so it guessed from the
    // raw card table. Ground truth: 9 is first place (Emmitt alone), 6 is
    // second place (a 4-way tie), 5 is third.
    const rank = detectOrdinalRank("second highest attack for tier 1 red cards");
    expect(rank).toBe(2);
    const groups = computeStatExtremes("attack", "max", ["RED"], [], 1, rank!);
    expect(groups).not.toBeNull();
    expect(groups!).toHaveLength(2);
    expect(groups![0].value).toBe(9);
    const secondPlace = groups!.slice(rank! - 1, rank!);
    expect(secondPlace).toHaveLength(1);
    expect(secondPlace[0].value).toBe(6);
    expect(secondPlace[0].matches.map((m) => m.heroName).sort()).toEqual(
      [
        "Arien the Tidemaster",
        "Brogan the Destroyer",
        "Mortimer the Awakener",
        "Mrak the Rockshaper",
      ].sort(),
    );
  });

  it("returns no groups past the last real rank (narrows to empty)", () => {
    const groups = computeStatExtremes("range", "max", [], [], 99, 2);
    expect(groups).toBeNull();
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

describe("getRelevantHeroIds — structural false-positive fixes", () => {
  // These guard the underlying mechanism, not just the two specific
  // words already covered by EXTRA_STOP_WORDS — the goal is that a
  // *future* generic word landing in some hero's card name/description
  // doesn't need its own one-off patch to avoid the same bug.

  it("never matches a whole-roster question naming no hero", () => {
    expect(getRelevantHeroIds("show me the green cards with the lowest initiative")).toEqual([]);
    expect(getRelevantHeroIds("who has the lowest red initiative")).toEqual([]);
    // Hit live: Min and Snorri's own card text uses the word "Tier" (as
    // in "a Tier II card"), so this whole-roster question — naming no
    // hero at all — matched Min in via that shared word, and the
    // precise stat computation never ran at all (relevantHeroIds wasn't
    // empty), producing an incomplete single-hero answer instead of a
    // real cross-hero one.
    expect(getRelevantHeroIds("show me tier 1 blue cards with the highest initiative")).toEqual([]);
  });

  it("still matches via a genuinely distinctive term from a card's own rules text", () => {
    // "Pyro" never appears in any card *name*, only in Widget's own kit's
    // description text — this is the positive case the description-
    // keyword index exists for; it must keep working.
    expect(getRelevantHeroIds("does clearing Pyro do anything special")).toContain("widget");
  });

  it("still matches a hero via a distinctive word unique to one of their card's own names", () => {
    // Sabina's "Troop Movement" is a real card; a question naming it
    // directly (not just the generic word "movement") should still work.
    expect(getRelevantHeroIds("what does troop movement do")).toContain("sabina");
  });
});

describe("multi-word card names are matched as a phrase, not word-by-word", () => {
  it("requires every word of the name, not just one of them", () => {
    // Widget's "All Aboard" only matches when both "all" and "aboard"
    // are present — a bare "all" floating in an unrelated question (the
    // live incident this guards against) is not enough.
    expect(getRelevantHeroIds("list all heroes gold damage")).toEqual([]);
    expect(getRelevantHeroIds("tell me about all aboard")).toContain("widget");
  });

  it("still matches a genuine multi-word name even when one of its words is an ordinary stopword", () => {
    // Bain's "Dead or Alive" contains "or", which extractKeywords strips
    // as noise from the question — phrase matching checks raw question
    // words instead of the stopword-filtered set for exactly this reason,
    // so a name containing a connector word isn't accidentally
    // unmatchable via its own full name.
    expect(getRelevantHeroIds("how does dead or alive work")).toContain("bain");
  });
});

describe("keyword collision audit", () => {
  // Proactive version of the fixes above: rather than waiting for a user
  // to hit the next movement/green/tier-style collision, this scans
  // every "distinctive" word (the kind getRelevantHeroIds trusts as a
  // hero-identifying signal) not already excluded by EXTRA_STOP_WORDS,
  // and fails if any of them looks like an ordinary word rather than a
  // genuine proper noun/game term — see auditDistinctiveKeywords' own
  // comment for the capitalization heuristic this relies on.
  //
  // Only card-NAME-source words are asserted against here: description-
  // source words get the same capitalization check applied live, at
  // runtime, in getRelevantHeroIds itself (an uncapitalized description
  // word can never match at all, regardless of distinctiveness — see its
  // own comment) — verified directly below — so they're not a live risk
  // even though they still show up in the raw audit for visibility.
  // Card names have no such runtime gate (a title is always capitalized
  // regardless of whether the underlying word is generic), so this is
  // the one category where "found by the audit" must mean "fix it now,"
  // not "already handled elsewhere." Note that a multi-word name (most of
  // them) isn't in this index at all any more — see CARD_NAME_PHRASES —
  // so what's left here is only ever a single-word name in its entirety
  // (e.g. "Cleave"), where the word being "generic-looking" doesn't
  // matter: it IS the whole name, so matching on it is correct by
  // definition, same as the hero-name match above it.
  it("has no unreviewed generic-looking words in card names", () => {
    const suspicious = auditDistinctiveKeywords().filter((e) => e.source === "name" && !e.everCapitalized);
    expect(suspicious).toEqual([]);
  });

  it("never lets an uncapitalized description word become a hero-matching signal", () => {
    // A live, previously-undetected instance of exactly the bug class
    // this whole mechanism exists to prevent: "except" is genuinely
    // distinctive (appears in only Arien's and Razzle's card text) but
    // is ordinary lowercase prose in both, not a real identifying term.
    const auditedAsRisky = auditDistinctiveKeywords().find((e) => e.word === "except" && e.source === "description");
    expect(auditedAsRisky?.everCapitalized).toBe(false);
    expect(getRelevantHeroIds("what happens except when a hero blocks")).toEqual([]);
  });

  it("doesn't let a generic quantifier at the start of a card title become a hero-matching signal", () => {
    // Hit live: "list all heroes gold damage" only ever showed Widget,
    // because Widget's card "All Aboard" makes "all" a distinctive
    // card-name-index word (heroIds.size 1) — and unlike a description
    // word, its capitalization (it's the leading word of a title) didn't
    // save it, since a title is always capitalized regardless of how
    // generic the underlying word is. Fixed by adding "all" (and the rest
    // of that quantifier closed class already partly represented via
    // "any"/"some") to BASE_STOP_WORDS, so it's filtered out of the
    // question itself before the index is ever consulted.
    expect(getRelevantHeroIds("list all heroes gold damage")).toEqual([]);
    expect(wantsCrossHeroStatSummary("list all heroes gold damage", [])).toBe(true);
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
