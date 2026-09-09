import { HEROES } from "@/lib/heroes";
import { HERO_CARDS, HeroCard } from "@/lib/heroCards";
import { extractKeywords as extractBaseKeywords } from "@/lib/textKeywords";

// Hard ceiling only — the keyword match below is what normally keeps a
// request far under this. Estimated via a rough ~4-characters-per-token
// heuristic, same as lib/discordContext.ts.
const CONTEXT_TOKEN_BUDGET = 20_000;
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * 4;

const CARD_COLORS = ["RED", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER"];

// On top of the base stopword list. The general principle: any word this
// app's own question-parsing already treats as a structured filter or
// meta-vocabulary — a stat name, a color, a tier/level word, "card"/
// "hero" itself — is never a legitimate signal that a *specific hero* is
// being asked about, no matter how it happens to intersect with the card
// database. If it were, asking about "the lowest initiative" or "tier 1
// cards" in general could accidentally get scoped to whichever one or
// two heroes happen to have that word in their own card text, instead of
// staying a whole-roster question. Three real, separate incidents found
// this way live, each initially patched one word at a time before this
// comment (and the matching card-name distinctiveness index below) made
// it a standing principle instead of a growing ad hoc list:
//   - Sabina has a card literally named "Troop Movement", so "What's
//     Arien's highest movement card?" matched her in too via the shared
//     word "movement".
//   - Bain's card text contains icon tokens like "::movement_green::",
//     so "the green cards with the lowest initiative" matched him in via
//     the word "green" extracted from inside that token — even though
//     the card isn't "about" green as a subject, just referencing a
//     colored stat icon (see stripIconTokens below for the structural
//     half of that fix).
//   - Min and Snorri's own card text happens to use the word "Tier" (as
//     in "a Tier II card"), so "tier 1 blue cards with the highest
//     initiative" — a whole-roster question — matched Min in via the
//     word "tier", which extractAskedLevel already consumes as a filter
//     and was never meant to also be a hero signal.
// A genuinely hero-specific question still works fine without these —
// it matches on the hero's own name/id instead, which isn't affected by
// this list.
const EXTRA_STOP_WORDS = new Set([
  "card", "cards", "hero", "heroes",
  "initiative", "movement", "defense", "defence", "attack", "range", "area",
  "tier", "level", "top",
  ...CARD_COLORS.map((c) => c.toLowerCase()),
  // Plain connector words that happen to sit inside a multi-word card
  // title ("Brace for Impact", "Playing with Fire", "Sting like a Bee")
  // — found via auditDistinctiveKeywords, not a live incident like the
  // words above: no legitimate question would ever rely on a bare "for"/
  // "with"/"like" to identify a specific hero, so these are excluded
  // pre-emptively rather than waiting for one to actually cause a wrong
  // answer.
  "here", "for", "with", "blows", "from", "like",
]);

// Splits on anything that isn't a letter/digit — including apostrophes,
// so a possessive like "Arien's" tokenizes to "arien" instead of a
// literal "arien's" that would never match the bare hero name "arien"
// (this silently dropped a hero's whole card set whenever a question
// used the possessive form, which is by far the most natural phrasing).
function extractKeywords(question: string): string[] {
  return extractBaseKeywords(question, EXTRA_STOP_WORDS);
}

// Every full hero name/card name gets tokenized the same way as the
// question, so e.g. "rowenna" matches both the hero id "rowenna" and
// "Rowenna the Vanguard", and a card name like "Code of Chivalry" matches
// on "chivalry" alone.
function nameKeywords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

// Card description text uses "::icon_name::" markup for inline stat/
// token icons (e.g. "::movement_green::", "::marker_bounty::") — this is
// rules-text *formatting*, not prose about to be searched for meaning.
// Left in place, a token like "::movement_green::" tokenizes (via
// nameKeywords' split on non-alphanumerics, which includes "_") into
// "movement" and "green" as if the card's text were actually about
// movement or the color green. Hit live: Bain's cards use this exact
// icon, and "green" leaking out of it got him matched into "the green
// cards with the lowest initiative" — a whole-roster query that should
// never have matched a specific hero at all. Stripped before indexing
// (and before any other keyword extraction over description text) so no
// future icon name can leak the same way, rather than reacting to each
// one individually as it's discovered.
function stripIconTokens(text: string): string {
  return text.replace(/::[a-zA-Z0-9_]+::/g, " ");
}

// A word → which heroes' card names/descriptions it appears in, built
// once at module load (the data is static) rather than per-request.
// Built the same way for both: a word only counts as identifying a hero
// if it's distinctive — appearing in few heroes' kits (like a unique
// companion name, or one hero's one-off card title) rather than common
// vocabulary that would otherwise match nearly every hero and defeat the
// point of filtering at all. Description-side, this lets a question find
// a hero via a distinctive term that's only in a card's rules text, not
// its name — e.g. "Pyro" (Widget's companion token) never appears in any
// card *name*, so without this a question like "can you clear Pyro?"
// would match nothing and the bot would (correctly, but unhelpfully) say
// it has no data, instead of finding Widget's kit. Name-side, this is
// what stops a card's own name from over-matching: hit live, Sabina has
// a card literally named "Troop Movement", and before this had the same
// distinctiveness check the description index already did, the bare
// word "movement" alone was enough to pull her into an unrelated,
// whole-roster movement comparison. Two separate indexes (not one
// merged one) since a name hit and a description hit warrant slightly
// different confidence in principle, even though both use the same
// threshold today.
const DISTINCTIVE_HERO_COUNT = 3;

type KeywordIndexEntry = { heroIds: Set<string>; everCapitalized: boolean };

// everCapitalized is computed once here (not just for the audit below)
// because it's used as a real runtime requirement for description-index
// matches, not just a report to review later — see requireCapitalized on
// buildKeywordIndex and its own comment on why.
function buildKeywordIndex(getText: (card: HeroCard) => string): Map<string, KeywordIndexEntry> {
  const index = new Map<string, KeywordIndexEntry>();
  for (const heroId of Object.keys(HERO_CARDS)) {
    for (const card of HERO_CARDS[heroId]) {
      const rawText = getText(card);
      for (const rawWord of rawText.split(/[^a-zA-Z0-9]+/)) {
        const word = rawWord.toLowerCase();
        if (word.length <= 2) continue;
        const entry = index.get(word) ?? { heroIds: new Set<string>(), everCapitalized: false };
        entry.heroIds.add(heroId);
        if (/^[A-Z]/.test(rawWord)) entry.everCapitalized = true;
        index.set(word, entry);
      }
    }
  }
  return index;
}

const CARD_NAME_KEYWORD_INDEX = buildKeywordIndex((card) => (typeof card.name === "string" ? card.name : ""));
const DESCRIPTION_KEYWORD_INDEX = buildKeywordIndex((card) =>
  stripIconTokens(typeof card.description === "string" ? card.description : ""),
);

export type KeywordAuditEntry = {
  word: string;
  source: "name" | "description";
  heroIds: string[];
  everCapitalized: boolean;
};

// Surfaces every "distinctive" word — the exact kind getRelevantHeroIds
// treats as a hero-identifying signal — that isn't already excluded via
// EXTRA_STOP_WORDS or (for description words) filtered out by the
// capitalization requirement below, so a future collision like the
// movement/green/tier incidents can be caught by review before a live
// question ever hits it, instead of after. See
// lib/heroCardContext.test.ts's "keyword collision audit" for how this
// is actually used (a maintained, reviewed allowlist checked against
// this list, not a fully automatic pass/fail) — this exists because the
// capitalization requirement only meaningfully filters description text
// (a card's own NAME is always capitalized as a title regardless of
// whether the word itself is generic, e.g. "Shield" as a card name), so
// name-index words still need this separate, manually-reviewed check.
export function auditDistinctiveKeywords(): KeywordAuditEntry[] {
  const sources: { source: "name" | "description"; index: Map<string, KeywordIndexEntry> }[] = [
    { source: "name", index: CARD_NAME_KEYWORD_INDEX },
    { source: "description", index: DESCRIPTION_KEYWORD_INDEX },
  ];

  const entries: KeywordAuditEntry[] = [];
  for (const { source, index } of sources) {
    for (const [word, entry] of index) {
      if (entry.heroIds.size > DISTINCTIVE_HERO_COUNT || EXTRA_STOP_WORDS.has(word)) continue;
      entries.push({ word, source, heroIds: [...entry.heroIds], everCapitalized: entry.everCapitalized });
    }
  }
  return entries;
}

// Which heroes a question appears to be about, by hero name, or a
// distinctive term from a card's own name or its rules text — shared by
// fetchRelevantHeroCards (what to send Gemini) and findMentionedCards
// (what to trust-verify in its reply), so both always agree on the same
// hero scope for a given question.
export function getRelevantHeroIds(question: string): string[] {
  const keywords = extractKeywords(question);
  if (keywords.length === 0) return [];

  const matched = new Set<string>();

  Object.keys(HERO_CARDS).forEach((id) => {
    const hero = HEROES.find((h) => h.id === id);
    const heroNameWords = new Set([
      ...nameKeywords(id),
      ...(hero ? nameKeywords(hero.name) : []),
    ]);
    if (keywords.some((kw) => heroNameWords.has(kw))) {
      matched.add(id);
    }
  });

  for (const kw of keywords) {
    const nameEntry = CARD_NAME_KEYWORD_INDEX.get(kw);
    if (nameEntry && nameEntry.heroIds.size <= DISTINCTIVE_HERO_COUNT) {
      nameEntry.heroIds.forEach((id) => matched.add(id));
    }

    // Description matches additionally require the word to appear
    // capitalized somewhere in its source occurrences — an audit run
    // against the live database found 249 of 333 otherwise-"distinctive"
    // description words were ordinary lowercase prose (rare purely by
    // the coincidence of which few heroes' rules text happens to use
    // that particular word), not genuine identifying terms like "Pyro".
    // Without this, each one is a latent version of the exact
    // movement/green/tier bug class waiting for the right question to
    // surface it. A card's own title doesn't have this problem (see
    // auditDistinctiveKeywords' comment), so this only applies here.
    const descriptionEntry = DESCRIPTION_KEYWORD_INDEX.get(kw);
    if (
      descriptionEntry &&
      descriptionEntry.heroIds.size <= DISTINCTIVE_HERO_COUNT &&
      descriptionEntry.everCapitalized
    ) {
      descriptionEntry.heroIds.forEach((id) => matched.add(id));
    }
  }

  return Array.from(matched);
}

// Sends Gemini only the hero(es) a question actually seems to be about,
// instead of the full card database (32 heroes/600+ cards) on every
// request — this was the single biggest driver of per-request token
// usage, since it was previously always included in full. Plain
// substring/keyword matching, not embeddings — cheap and good enough at
// this data size, same approach as the Discord context filter.
export function fetchRelevantHeroCards(heroIds: string[]): string {
  if (heroIds.length === 0) return "";

  const selected: Record<string, (typeof HERO_CARDS)[string]> = {};
  const kept = [...heroIds];
  kept.forEach((id) => {
    selected[id] = HERO_CARDS[id];
  });

  let json = JSON.stringify(selected);
  if (json.length > CONTEXT_CHAR_BUDGET) {
    // Defensive trim if an unusually broad match (many heroes at once)
    // still overflows the budget — drop heroes from the end until it
    // fits, rather than truncating mid-JSON and breaking parsing.
    while (kept.length > 1 && json.length > CONTEXT_CHAR_BUDGET) {
      const dropped = kept.pop()!;
      delete selected[dropped];
      json = JSON.stringify(selected);
    }
  }

  return json;
}

export type CardReference = {
  heroId: string;
  heroName: string;
  card: HeroCard;
  // Set when the question named a specific card color (e.g. "which tier 2
  // RED card") and this card's actual color field doesn't match — the
  // model has repeatedly discussed an off-color card (e.g. a Blue card)
  // as if it belonged to the asked-about color while its own prose framed
  // it that way, even though the deterministic block below it already
  // showed the correct color. This makes that specific mismatch
  // impossible to miss rather than relying on the model not to make it.
  colorMismatch?: boolean;
};

// Which card colors (if any) the question itself named, e.g. "red" in
// "which tier 2 red card should I upgrade to".
export function extractAskedColors(question: string): string[] {
  const lower = question.toLowerCase();
  return CARD_COLORS.filter((color) => new RegExp(`\\b${color.toLowerCase()}\\b`).test(lower));
}

// Word-boundary patterns, not plain substrings — a word list here would
// either miss phrasing variants ("how do I play" vs. "how should I
// play") or false-positive on substrings ("cardinal" containing "card").
// Narrow on purpose: literal asks for a card's own facts, not just any
// question that happens to touch on a hero's kit — "how do I play X"
// doesn't belong here (see wantsHeroCardContext below), because naming
// the hero doesn't mean the user wants a stat-block dump.
const CARD_DETAIL_PATTERNS = [
  /\bcards?\b/, /\btiers?\b/, /\binitiative\b/, /\bstats?\b/,
  /\bmodifiers?\b/, /\bwhich card\b/, /\bwhat card\b/,
  /\bkit\b/, /\bshow (me )?(her|his|their|the) cards\b/,
  /\blist (her|his|their|the) cards\b/,
];

// Whether a question explicitly wants a hero card's own facts (name,
// tier, color, exact numbers) — as opposed to a general strategy
// question that merely benefits from card data as background (see
// wantsHeroCardContext) or a Discord-history question that just happens
// to mention a hero by name. Gates the "don't restate stats yourself"
// instruction, the color-mismatch check, and whether the deterministic
// card stat-block UI renders at all — the user explicitly asked for
// those blocks to stay hidden unless they actually asked about card
// details, even on a question that also gets card data as context.
export function isCardDetailQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  if (extractAskedColors(question).length > 0) return true;
  return CARD_DETAIL_PATTERNS.some((re) => re.test(lower));
}

// Broader than isCardDetailQuestion — also covers gameplay/strategy
// phrasing ("how do I play X", "any tips for X") that never says the
// word "card" but still needs the hero's actual kit to answer well
// (their cards ARE the strategy). Gates only whether hero-card data is
// sent to the model at all, not whether the reply shows card facts —
// see isCardDetailQuestion for that narrower gate. Deliberately broad:
// sending a small amount of extra card context on a false positive is
// cheap, while missing a real "how do I play X" question starves the
// model of the data it needs to give real advice instead of vague
// generic rules-only prose.
const STRATEGY_INTENT_PATTERNS = [
  /\bupgrad(e|ing|es)\b/, /\bskills?\b/, /\babilit(y|ies)\b/, /\bdamage\b/,
  /\blevel(ed|s)? up\b/,
  /\bhow (do|did|does|should|would|can|could) (i|you|we|one) plays?\b/,
  /\bhow to play\b/, /\bplay(ing)? as\b/, /\bstrateg(y|ies)\b/,
  /\btips?\b/, /\bguide\b/, /\bplaystyle\b/, /\bplay style\b/,
  /\bbuild\b/, /\bcombos?\b/, /\bcounter(s|ing)?\b/, /\bmatchups?\b/,
  /\brecommend(s|ed|ation)?\b/, /\bsuggest(s|ed|ion)?\b/,
  /\bbest way to play\b/, /\bgood against\b/, /\bweak against\b/,
  /\bwin condition\b/, /\bopening\b/,
];

// "Lowest red initiative", "who has the highest attack", "which heroes
// have a movement card with area" — questions comparing a stat *across*
// heroes rather than asking about one hero's own kit. These never name a
// hero (there's nothing to name — the whole point is "which hero"), so
// getRelevantHeroIds always comes back empty for them and the model was
// left with zero card data to compare, producing an honest but useless
// "I don't have every hero's details" instead of an actual answer.
const CROSS_HERO_COMPARISON_PATTERNS = [
  /\blowest\b/, /\bhighest\b/, /\bmost\b/, /\bleast\b/, /\bfewest\b/,
  /\bbest\b/, /\bworst\b/, /\bstrongest\b/, /\bweakest\b/,
  /\bfastest\b/, /\bslowest\b/,
  /\bwho has\b/, /\bwhich hero(es)?\b/, /\bwhat hero(es)?\b/, /\bany hero(es)?\b/,
  /\ball heroes\b/, /\bevery hero\b/, /\bcompare\b/, /\bcomparison\b/,
  /\brank(ed|ing)?\b/,
];

// Only worth building the (still nontrivial) all-heroes stat table when
// there's no hero already in scope to answer from — a superlative about
// one already-named hero ("Arien's highest initiative card") is answered
// fine from that hero's own card set, already sent via the normal path.
export function wantsCrossHeroStatSummary(question: string, relevantHeroIds: string[]): boolean {
  if (relevantHeroIds.length > 0) return false;
  if (!isCardDetailQuestion(question)) return false;
  const lower = question.toLowerCase();
  return CROSS_HERO_COMPARISON_PATTERNS.some((re) => re.test(lower));
}

// Even with the full, correct data in front of it (see
// buildAllHeroStatSummary below), the model can still misread a 578-row
// text table when asked to find every card tied at some extreme value —
// hit live: asked for "the red cards with the lowest initiative", it
// correctly said "value of 7" but then also listed some actual-8 cards
// alongside the real 7s. Scanning a long table for an exact numeric tie
// is exactly the kind of arithmetic/transcription task LLMs are
// unreliable at, independent of whether the underlying data they were
// given is correct. These stats get a precise, code-computed answer
// instead of asking the model to derive it — see computeStatExtremes
// below — the same "don't trust the model's own arithmetic on data it
// already has" principle findMentionedCards already applies per-card,
// just applied here at the aggregate level.
export type StatKind = "initiative" | "movement" | "defense" | "attack" | "range" | "area";

export const STAT_LABELS: Record<StatKind, string> = {
  initiative: "Initiative",
  movement: "Movement",
  defense: "Defense",
  attack: "Attack",
  range: "Range",
  area: "Area",
};

// Resolves the one number a "lowest/highest X" question about `stat`
// actually means for a given card. Several of these aren't a single
// column: a card's "movement value" is its primaryValue when Movement is
// that card's own primary action, and secondaryMovement otherwise (same
// primary/secondary split for defense and attack — see cardPainter.ts's
// placeSecondary, which resolves this exact ambiguity to decide what to
// draw), while range/area only exist at all on cards that carry that
// specific modifier. Returns null when the stat doesn't apply to this
// card at all, so that card is correctly excluded from the comparison
// rather than treated as a false 0.
function resolveStatValue(card: HeroCard, stat: StatKind): number | null {
  switch (stat) {
    case "initiative":
      return typeof card.initiative === "number" ? card.initiative : null;
    case "movement":
      // Silver cards' secondary action is never Movement, and the rules
      // don't give them a movement value at all (see cardPainter.ts's
      // own hasSecondaryMovement check) — excluded rather than reading a
      // stray 0 as a real value.
      if (card.color === "SILVER") return null;
      if (card.primaryAction === "MOVEMENT") {
        return typeof card.primaryValue === "number" ? card.primaryValue : null;
      }
      return typeof card.secondaryMovement === "number" && card.secondaryMovement !== 0
        ? card.secondaryMovement
        : null;
    case "defense":
      if (card.primaryAction === "DEFENSE" || card.primaryAction === "DEFENSE_SKILL") {
        return typeof card.primaryValue === "number" ? card.primaryValue : null;
      }
      return typeof card.secondaryDefense === "number" ? card.secondaryDefense : null;
    case "attack":
      if (card.primaryAction === "ATTACK") {
        return typeof card.primaryValue === "number" ? card.primaryValue : null;
      }
      return typeof card.secondaryAttack === "number" ? card.secondaryAttack : null;
    case "range":
      return card.modifier === "RANGE" && typeof card.modifierValue === "number" ? card.modifierValue : null;
    case "area":
      return card.modifier === "AREA" && typeof card.modifierValue === "number" ? card.modifierValue : null;
    default:
      return null;
  }
}

const STAT_KEYWORD_PATTERNS: { stat: StatKind; pattern: RegExp }[] = [
  { stat: "initiative", pattern: /\binitiative\b/ },
  { stat: "movement", pattern: /\bmovement\b/ },
  { stat: "defense", pattern: /\bdefen[cs]e\b/ },
  { stat: "attack", pattern: /\battack\b/ },
  { stat: "range", pattern: /\brange\b/ },
  { stat: "area", pattern: /\barea\b/ },
];

// Shared across every stat, not just initiative — "fastest"/"slowest"
// naturally map to max/min for movement too ("fastest" = moves the most
// spaces), and there's no stat here where high-vs-low intuition actually
// inverts (initiative's own "highest acts first" rule still means
// "fastest" = highest number, same direction as every other stat).
const STAT_MIN_PATTERNS = [/\blowest\b/, /\bslowest\b/, /\bleast\b/, /\bminimum\b/, /\bsmallest\b/, /\bshortest\b/];
const STAT_MAX_PATTERNS = [
  /\bhighest\b/, /\bfastest\b/, /\bmost\b/, /\bmaximum\b/, /\bbiggest\b/, /\blargest\b/, /\blongest\b/,
];

export function detectStatSuperlative(question: string): { stat: StatKind; direction: "min" | "max" } | null {
  const lower = question.toLowerCase();
  const statMatch = STAT_KEYWORD_PATTERNS.find(({ pattern }) => pattern.test(lower));
  if (!statMatch) return null;
  if (STAT_MIN_PATTERNS.some((re) => re.test(lower))) return { stat: statMatch.stat, direction: "min" };
  if (STAT_MAX_PATTERNS.some((re) => re.test(lower))) return { stat: statMatch.stat, direction: "max" };
  return null;
}

// "tier 1", "level 2", "tier iii" — an additional filter dimension
// alongside color for a stat superlative question. Roman numerals
// accepted since that's how levels 1-3 are printed on the physical
// cards (see cardPainter.ts's own level_i/ii/iii/iv assets); Arabic
// digits also accepted since that's how players actually talk.
export function extractAskedLevel(question: string): number | null {
  const match = question.toLowerCase().match(/\b(?:tier|level)\s*(iv|iii|ii|i|[1-4])\b/);
  if (!match) return null;
  const raw = match[1];
  if (raw === "i") return 1;
  if (raw === "ii") return 2;
  if (raw === "iii") return 3;
  if (raw === "iv") return 4;
  return parseInt(raw, 10);
}

// "top 3 lowest initiative cards" — how many distinct values (not cards)
// to include, so ties within a value don't quietly cut the list short.
// Defaults to 1 (today's plain "the lowest/highest" behavior) wherever
// no explicit count is asked for.
export function detectTopN(question: string): number {
  const match = question.toLowerCase().match(/\btop\s+(\d+)\b/);
  const n = match ? parseInt(match[1], 10) : 1;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 1;
}

const ORDINAL_RANK_WORDS: Record<number, string> = {
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
  9: "ninth",
  10: "tenth",
};
const ORDINAL_RANK_LOOKUP: Record<string, number> = Object.fromEntries(
  Object.entries(ORDINAL_RANK_WORDS).map(([rank, word]) => [word, Number(rank)]),
);

// Word for a rank in prose ("second", "third", ... falling back to
// "11th" past the words above, though detectOrdinalRank never returns
// past 10 anyway).
export function ordinalRankWord(rank: number): string {
  return ORDINAL_RANK_WORDS[rank] ?? `${rank}th`;
}

// "second highest attack", "2nd-lowest initiative" — a request for ONE
// specific rank, not a 1..N list (contrast detectTopN's "top 3", which
// wants every rank up to 3 listed out). Returns null for the plain
// "highest"/"lowest" case (rank 1), which already works without this.
// Hit live: asked "second highest attack for tier 1 red card", got back
// a value (7) that doesn't exist anywhere in that data at all, because
// nothing pre-computed anything past rank 1 and the model was left to
// guess the rest from the raw card table — same failure mode
// computeStatExtremes exists to avoid for the plain case. Capped at 10
// to match detectTopN's cap.
export function detectOrdinalRank(question: string): number | null {
  const lower = question.toLowerCase();
  const wordMatch = lower.match(/\b(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/);
  if (wordMatch) return ORDINAL_RANK_LOOKUP[wordMatch[1]];
  const digitMatch = lower.match(/\b([2-9]|10)(?:st|nd|rd|th)\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  return null;
}

export type StatExtremeMatch = { heroName: string; cardName: string; color: string; level: number | null };
export type StatExtremeGroup = { value: number; matches: StatExtremeMatch[] };

function cardMatchesFilters(card: HeroCard, colors: string[], level: number | null): boolean {
  const color = typeof card.color === "string" ? card.color : "";
  if (colors.length > 0 && !colors.includes(color)) return false;
  if (level !== null && card.level !== level) return false;
  return true;
}

// heroIds restricts the comparison to specific heroes' own cards (e.g.
// "Arien's highest initiative card" should only compare Arien's cards,
// not the whole roster) — empty means every hero, for a true cross-hero
// comparison ("who has the highest attack in the game"). groupCount > 1
// returns that many distinct values worth of groups instead of just the
// single best (see detectTopN) — e.g. groupCount 3 on "min" returns the
// 3 lowest distinct values found, each with every card at that value.
export function computeStatExtremes(
  stat: StatKind,
  direction: "min" | "max",
  colors: string[],
  heroIds: string[] = [],
  level: number | null = null,
  groupCount: number = 1,
): StatExtremeGroup[] | null {
  const scopeIds = heroIds.length > 0 ? heroIds : Object.keys(HERO_CARDS);

  const distinctValues = new Set<number>();
  for (const heroId of scopeIds) {
    for (const card of HERO_CARDS[heroId] ?? []) {
      if (!cardMatchesFilters(card, colors, level)) continue;
      const value = resolveStatValue(card, stat);
      if (value !== null) distinctValues.add(value);
    }
  }
  if (distinctValues.size === 0) return null;

  const orderedValues = [...distinctValues].sort((a, b) => (direction === "min" ? a - b : b - a));
  const targetValues = orderedValues.slice(0, groupCount);

  return targetValues.map((targetValue) => {
    const matches: StatExtremeMatch[] = [];
    for (const heroId of scopeIds) {
      const heroName = HEROES.find((h) => h.id === heroId)?.name ?? heroId;
      for (const card of HERO_CARDS[heroId] ?? []) {
        if (!cardMatchesFilters(card, colors, level)) continue;
        if (resolveStatValue(card, stat) === targetValue) {
          matches.push({
            heroName,
            cardName: typeof card.name === "string" ? card.name : "",
            color: typeof card.color === "string" ? card.color : "",
            level: typeof card.level === "number" ? card.level : null,
          });
        }
      }
    }
    return { value: targetValue, matches };
  });
}

// "Compare Arien and Misa's initiative" — two or more named heroes plus
// a stat and comparison wording, but no explicit min/max direction word.
// Distinct from computeStatExtremes above: there's no single "winner" to
// find, just each named hero's own values laid out precisely so the
// model doesn't have to (mis)read them off raw card JSON itself.
const COMPARISON_WORD_PATTERN = /\bcompar(e|ison)\b|\bvs\.?\b|\bversus\b/;

export function detectNamedHeroStatComparison(question: string, relevantHeroIds: string[]): StatKind | null {
  if (relevantHeroIds.length < 2) return null;
  const lower = question.toLowerCase();
  if (!COMPARISON_WORD_PATTERN.test(lower)) return null;
  const statMatch = STAT_KEYWORD_PATTERNS.find(({ pattern }) => pattern.test(lower));
  return statMatch?.stat ?? null;
}

export type HeroStatBreakdown = {
  heroName: string;
  cards: { cardName: string; color: string; level: number | null; value: number }[];
};

export function computeStatBreakdown(
  stat: StatKind,
  heroIds: string[],
  colors: string[],
  level: number | null = null,
): HeroStatBreakdown[] {
  return heroIds.map((heroId) => {
    const heroName = HEROES.find((h) => h.id === heroId)?.name ?? heroId;
    const cards: HeroStatBreakdown["cards"] = [];
    for (const card of HERO_CARDS[heroId] ?? []) {
      if (!cardMatchesFilters(card, colors, level)) continue;
      const value = resolveStatValue(card, stat);
      if (value === null) continue;
      cards.push({
        cardName: typeof card.name === "string" ? card.name : "",
        color: typeof card.color === "string" ? card.color : "",
        level: typeof card.level === "number" ? card.level : null,
        value,
      });
    }
    return { heroName, cards };
  });
}

// One compact line per card across every hero (not per-hero JSON, which
// at 32 heroes/~600 cards would run well over budget once every field is
// repeated card after card) — just the numeric/categorical fields a stat
// comparison actually needs, skipping description/traits entirely. Small
// enough (well under 20k tokens even unfiltered) to never need the
// defensive per-hero trim fetchRelevantHeroCards uses, which matters
// here specifically: trimming would silently drop some heroes from a
// comparison and risk naming the wrong "lowest"/"highest" card.
export function buildAllHeroStatSummary(askedColors: string[]): string {
  const header = "Hero | Card | Color | Level | Initiative | PrimaryAction | PrimaryValue | Movement | Defense | Attack";
  const rows: string[] = [header];

  for (const heroId of Object.keys(HERO_CARDS)) {
    const hero = HEROES.find((h) => h.id === heroId);
    const heroName = hero?.name ?? heroId;
    for (const card of HERO_CARDS[heroId]) {
      const color = typeof card.color === "string" ? card.color : "";
      if (askedColors.length > 0 && !askedColors.includes(color)) continue;
      const name = typeof card.name === "string" ? card.name : "";
      const level = typeof card.level === "number" ? card.level : "-";
      const initiative = typeof card.initiative === "number" ? card.initiative : "-";
      const primaryAction = typeof card.primaryAction === "string" ? card.primaryAction : "-";
      const primaryValue = typeof card.primaryValue === "number" ? card.primaryValue : "-";
      const movement = typeof card.secondaryMovement === "number" ? card.secondaryMovement : "-";
      const defense = typeof card.secondaryDefense === "number" ? card.secondaryDefense : "-";
      const attack = typeof card.secondaryAttack === "number" ? card.secondaryAttack : "-";
      rows.push(
        `${heroName} | ${name} | ${color} | ${level} | ${initiative} | ${primaryAction} | ${primaryValue} | ${movement} | ${defense} | ${attack}`,
      );
    }
  }

  return rows.join("\n");
}

export function wantsHeroCardContext(question: string): boolean {
  if (isCardDetailQuestion(question)) return true;
  const lower = question.toLowerCase();
  if (STRATEGY_INTENT_PATTERNS.some((re) => re.test(lower))) return true;
  // If the question names a specific hero (or a distinctive term unique
  // to their kit, e.g. "bounty" for Bain, "Pyro" for Widget) at all, get
  // their card data — a hero-specific question almost always benefits
  // from their real card text as grounding regardless of how it's
  // phrased ("does Bain's bounty token go away if he dies" never says
  // "card"/"tips"/"strategy", but is squarely about his kit). Missing
  // this previously left the model with only Discord/rulebook text and
  // no way to cross-check a specific hero mechanic, so it defaulted to
  // "I don't have that data" even when Discord actually answered it.
  return getRelevantHeroIds(question).length > 0;
}

// Scans a model reply for real card names and returns their exact data
// straight from HERO_CARDS — this is the actual fix for the model
// misstating a card's color/stats while summarizing: instead of trusting
// its prose recitation of numbers it already had in context, the app
// renders each named card's fields directly from source data, so nothing
// the user sees as a "fact" about a specific card ever passed through the
// model's own synthesis.
//
// Scoped to the same heroIds that were actually sent for this request
// (not the full 610-card database) — scanning every hero risks false
// positives from short/generic card names that happen to be ordinary
// English words (e.g. "Focus", "Control") showing up incidentally in the
// model's prose about a completely different hero.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findMentionedCards(
  replyText: string,
  heroIds: string[],
  askedColors: string[] = [],
): CardReference[] {
  const lowerReply = replyText.toLowerCase();

  // A card name can coincidentally be a substring of a hero's own
  // display name — e.g. Gydion's ultimate is literally named "The
  // Archwizard", and his full display name is "Gydion the Archwizard".
  // Blanking out every in-scope hero's full name before the substring
  // scan below stops an ordinary mention of the hero (by name/title)
  // from being misattributed as a mention of that specific card, while
  // still catching a genuine standalone reference to the card elsewhere
  // in the text.
  let searchText = lowerReply;
  for (const heroId of heroIds) {
    const heroName = HEROES.find((h) => h.id === heroId)?.name.toLowerCase();
    if (heroName) searchText = searchText.split(heroName).join(" ".repeat(heroName.length));
  }

  type Candidate = { heroId: string; card: HeroCard; name: string };
  const candidates: Candidate[] = [];
  for (const heroId of heroIds) {
    for (const card of HERO_CARDS[heroId] ?? []) {
      const name = typeof card.name === "string" ? card.name : "";
      // Short names (e.g. a 2-3 letter card) risk false-positive
      // substring matches against ordinary prose — this game's card
      // names are distinctive multi-word phrases, so requiring a
      // reasonable minimum length costs nothing in practice.
      if (name.length < 4) continue;
      candidates.push({ heroId, card, name });
    }
  }
  if (candidates.length === 0) return [];

  // Real, distinct cards can have one name sitting as a literal prefix
  // of another's — e.g. Brogan's "Shield" vs. his own "Shield Bash",
  // Xargatha's "Control" vs. Razzle's "Crowd Control". Checking each
  // name independently (the previous approach) meant a reply naming only
  // the longer card also mis-flagged the shorter one as mentioned,
  // purely because its letters happen to appear at the start of the
  // longer name. Matching via one combined regex, longest names first,
  // resolves this the same way app/chat/page.tsx's own wrapCardMentions
  // already does for highlighting: at a given position the engine commits
  // to the first alternative that matches, so "Shield Bash" (tried first)
  // wins over "Shield" wherever both could otherwise match, while
  // "Shield" mentioned entirely on its own elsewhere still matches fine.
  // No \b word-boundary anchors: some real card names end in punctuation
  // (e.g. Mortimer's "Braains...!"), where a trailing \b would fail to
  // match at all (both the "!" and whatever follows it are non-word
  // characters, so there's no word/non-word boundary there) — that would
  // silently stop that card from ever being detected. Plain alternation,
  // longest names first, is exactly what wrapCardMentions already uses
  // client-side for the same reason.
  const sortedNames = [...new Set(candidates.map((c) => c.name))].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?:${sortedNames.map(escapeRegExp).join("|")})`, "gi");
  const matchedNames = new Set(searchText.match(pattern)?.map((m) => m.toLowerCase()) ?? []);
  if (matchedNames.size === 0) return [];

  const found: CardReference[] = [];
  const seen = new Set<string>();
  for (const { heroId, card, name } of candidates) {
    if (!matchedNames.has(name.toLowerCase())) continue;
    const key = `${heroId}::${name}`;
    if (seen.has(key)) continue;
    const hero = HEROES.find((h) => h.id === heroId);
    const cardColor = typeof card.color === "string" ? card.color : null;
    const colorMismatch = askedColors.length > 0 && cardColor !== null && !askedColors.includes(cardColor);
    found.push({ heroId, heroName: hero?.name ?? heroId, card, colorMismatch });
    seen.add(key);
  }
  return found;
}
