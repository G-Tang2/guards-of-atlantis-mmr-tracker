// Shared by every place in the chatbot that turns a natural-language
// question into a set of matchable words: hero/card name matching
// (heroCardContext.ts), Discord history search (discordContext.ts), and
// rulebook page filtering (rulebook.ts). All three used to keep their own
// copy of this exact tokenizer + a near-identical stopword list, which
// only stayed in sync by coincidence — this is the one place to change
// the base behavior (e.g. the apostrophe-splitting rule) for all of them.
export const BASE_STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "at", "for", "with", "about", "what", "who",
  "when", "where", "why", "how", "did", "do", "does", "it", "this", "that",
  "i", "you", "we", "they", "he", "she", "there", "any", "some",
  // Quantifiers/determiners — same closed class as "any"/"some" above,
  // just missing until "list all heroes gold damage" matched a single
  // hero via a card literally named "All Aboard": "all" was never
  // filtered out of the question itself, so it fell through to the
  // card-name distinctiveness index and got treated as if the user had
  // named that hero specifically.
  "all", "each", "every", "both", "no",
]);

// Splits on anything that isn't a letter/digit — including apostrophes,
// so a possessive like "Keith's" tokenizes to "keith" instead of a
// literal "keith's" that would never match a plain "Keith"/"keith" in
// the target text. `extraStopWords` lets a caller filter out words that
// are common in its own domain but not generically (e.g. "card"/"hero"
// for hero-card matching, "can" for rulebook matching) without needing
// its own copy of the base list or the splitting logic.
export function extractKeywords(text: string, extraStopWords?: Set<string>): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !BASE_STOP_WORDS.has(w) && !extraStopWords?.has(w)),
    ),
  );
}
