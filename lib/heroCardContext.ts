import { HEROES } from "@/lib/heroes";
import { HERO_CARDS, HeroCard } from "@/lib/heroCards";

// Hard ceiling only — the keyword match below is what normally keeps a
// request far under this. Estimated via a rough ~4-characters-per-token
// heuristic, same as lib/discordContext.ts.
const CONTEXT_TOKEN_BUDGET = 20_000;
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * 4;

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "at", "for", "with", "about", "what", "who",
  "when", "where", "why", "how", "did", "do", "does", "it", "this", "that",
  "i", "you", "we", "they", "he", "she", "there", "any", "some", "card",
  "cards", "hero", "heroes",
]);

// Splits on anything that isn't a letter/digit — including apostrophes,
// so a possessive like "Arien's" tokenizes to "arien" instead of a
// literal "arien's" that would never match the bare hero name "arien"
// (this silently dropped a hero's whole card set whenever a question
// used the possessive form, which is by far the most natural phrasing).
function extractKeywords(question: string): string[] {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    ),
  );
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

// A word → which heroes' card descriptions it appears in, built once at
// module load (the data is static) rather than per-request. Lets a
// question find a hero via a distinctive term that's only in a card's
// rules text, not its name — e.g. "Pyro" (Widget's companion token) never
// appears in any card *name*, so without this a question like "can you
// clear Pyro?" would match nothing and the bot would (correctly, but
// unhelpfully) say it has no data, instead of finding Widget's kit.
const DESCRIPTION_KEYWORD_INDEX: Map<string, Set<string>> = (() => {
  const index = new Map<string, Set<string>>();
  for (const heroId of Object.keys(HERO_CARDS)) {
    for (const card of HERO_CARDS[heroId]) {
      const description = typeof card.description === "string" ? card.description : "";
      for (const word of nameKeywords(description)) {
        const heroes = index.get(word) ?? new Set<string>();
        heroes.add(heroId);
        index.set(word, heroes);
      }
    }
  }
  return index;
})();

// A description keyword only counts as identifying a hero if it's
// distinctive — appearing in few heroes' kits (like a unique companion
// name) rather than common game vocabulary ("attack", "target", "move")
// that would otherwise match nearly every hero and defeat the point of
// filtering at all.
const DISTINCTIVE_HERO_COUNT = 3;

// Which heroes a question appears to be about, by hero name, card name, or
// a distinctive term from a card's rules text — shared by
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
      return;
    }

    const cardNameMatch = HERO_CARDS[id].some((card) => {
      const cardName = typeof card.name === "string" ? card.name : "";
      const cardWords = new Set(nameKeywords(cardName));
      return keywords.some((kw) => cardWords.has(kw));
    });
    if (cardNameMatch) matched.add(id);
  });

  for (const kw of keywords) {
    const heroesForWord = DESCRIPTION_KEYWORD_INDEX.get(kw);
    if (heroesForWord && heroesForWord.size <= DISTINCTIVE_HERO_COUNT) {
      heroesForWord.forEach((id) => matched.add(id));
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

const CARD_COLORS = ["RED", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER"];

// Which card colors (if any) the question itself named, e.g. "red" in
// "which tier 2 red card should I upgrade to".
export function extractAskedColors(question: string): string[] {
  const lower = question.toLowerCase();
  return CARD_COLORS.filter((color) => new RegExp(`\\b${color.toLowerCase()}\\b`).test(lower));
}

// Word-boundary patterns, not plain substrings — a word list here would
// either miss phrasing variants ("how do I play" vs. "how should I
// play") or false-positive on substrings ("cardinal" containing "card").
// Covers both literal card-detail asks ("what tier is X") and gameplay/
// strategy asks ("how do I play X", "any tips for X") — the latter still
// needs the hero's actual kit to answer well (their cards ARE the
// strategy), even though it never says the word "card".
const CARD_INTENT_PATTERNS = [
  /\bcards?\b/, /\btiers?\b/, /\binitiative\b/, /\bupgrad(e|ing|es)\b/,
  /\bskills?\b/, /\babilit(y|ies)\b/, /\bkit\b/, /\bstats?\b/,
  /\bdamage\b/, /\bmodifiers?\b/, /\blevel(ed|s)? up\b/,
  /\bhow (do|did|does|should|would|can|could) (i|you|we|one) plays?\b/,
  /\bhow to play\b/, /\bplay(ing)? as\b/, /\bstrateg(y|ies)\b/,
  /\btips?\b/, /\bguide\b/, /\bplaystyle\b/, /\bplay style\b/,
  /\bbuild\b/, /\bcombos?\b/, /\bcounter(s|ing)?\b/, /\bmatchups?\b/,
  /\brecommend(s|ed|ation)?\b/, /\bsuggest(s|ed|ion)?\b/,
  /\bbest way to play\b/, /\bgood against\b/, /\bweak against\b/,
  /\bwin condition\b/, /\bopening\b/,
];

// Whether a question is actually asking about a hero's action cards or
// how to play them, as opposed to a general/Discord-history question
// that just happens to mention a hero by name (e.g. "what did people say
// about Rowenna last night?") — gates whether hero-card data is sent at
// all and whether the card stat-block UI shows up, so a passing mention
// doesn't trigger an unrelated dump of their card stats. Deliberately
// broad: sending a small amount of extra card context on a false
// positive is cheap, while missing a real "how do I play X" question
// starves the model of the exact data it needs to give real advice
// instead of vague generic rules-only prose.
export function isCardDetailQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  if (extractAskedColors(question).length > 0) return true;
  return CARD_INTENT_PATTERNS.some((re) => re.test(lower));
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
export function findMentionedCards(
  replyText: string,
  heroIds: string[],
  askedColors: string[] = [],
): CardReference[] {
  const lowerReply = replyText.toLowerCase();
  const found: CardReference[] = [];
  const seen = new Set<string>();

  for (const heroId of heroIds) {
    const hero = HEROES.find((h) => h.id === heroId);
    const cards = HERO_CARDS[heroId] ?? [];
    for (const card of cards) {
      const name = typeof card.name === "string" ? card.name : "";
      // Short names (e.g. a 2-3 letter card) risk false-positive
      // substring matches against ordinary prose — this game's card
      // names are distinctive multi-word phrases, so requiring a
      // reasonable minimum length costs nothing in practice.
      if (name.length < 4) continue;
      const key = `${heroId}::${name}`;
      if (seen.has(key)) continue;
      if (lowerReply.includes(name.toLowerCase())) {
        const cardColor = typeof card.color === "string" ? card.color : null;
        const colorMismatch =
          askedColors.length > 0 && cardColor !== null && !askedColors.includes(cardColor);
        found.push({ heroId, heroName: hero?.name ?? heroId, card, colorMismatch });
        seen.add(key);
      }
    }
  }
  return found;
}
