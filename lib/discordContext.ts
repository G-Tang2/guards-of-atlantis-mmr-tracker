import { supabaseServer } from "@/lib/supabase/server";

// The active constraint for most real questions, not just a rare-edge-
// case ceiling — the group's history has grown to tens of thousands of
// messages, so a natural-language question's keywords routinely have
// enough combined matches to fill this budget (see the priority-fill
// loop below for how that's kept from crowding out the most relevant
// hits). Estimated via a rough ~4-characters-per-token heuristic rather
// than a real tokenizer. Kept deliberately tight (along with the
// rulebook and hero-card contexts) so a single request stays well under
// Gemini's per-minute token limit even when a few messages go out in
// quick succession.
const CONTEXT_TOKEN_BUDGET = 200_000;
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * 4;

// Always included regardless of keyword relevance, so the bot still has
// some ambient context for a vague question ("what's new?") that doesn't
// match specific words.
const RECENT_MESSAGE_FLOOR = 150;

// Safety cap on how many rows a single keyword's query pulls back from
// the database — the CONTEXT_CHAR_BUDGET trim below is what actually
// decides what makes it into the prompt in the normal case; this just
// bounds worst-case data transfer if a keyword happens to be generic
// enough to match thousands of rows. Ordered by recency, so a cap here
// keeps the newest matches for that keyword. Also happens to match
// Supabase/PostgREST's own default max-rows setting, which silently
// clamps any client-requested `.limit()` above it anyway.
const MATCHED_ROW_LIMIT_PER_KEYWORD = 1000;

// Bounds how many keywords a single question can query for — a
// pathological wall of text could otherwise tokenize into hundreds of
// keywords and fire that many parallel queries. Real questions rarely
// have more than a handful of meaningful (non-stopword) terms.
const MAX_QUERY_KEYWORDS = 12;

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "at", "for", "with", "about", "what", "who",
  "when", "where", "why", "how", "did", "do", "does", "it", "this", "that",
  "i", "you", "we", "they", "he", "she", "there", "any", "some",
]);

// Splits on anything that isn't a letter/digit — including apostrophes,
// so a possessive like "Keith's" tokenizes to "keith" instead of a
// literal "keith's" that would never substring-match plain "Keith" in a
// message's content.
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

type DiscordMessageRow = {
  id: string;
  channel_name: string;
  author_username: string;
  content: string;
  created_at: string;
};

const SELECT_COLUMNS = "id, channel_name, author_username, content, created_at";

// Sends Gemini a keyword-relevant slice of the Discord history instead of
// the whole table every time — the table holds the group's full
// multi-year history (tens of thousands of rows), far more than a given
// question needs or a single request should transfer.
//
// Keyword filtering happens in Postgres via ILIKE, not by pulling every
// row over the wire and filtering in JS — the previous version did a
// plain `.select()` with no explicit limit, which silently caps at
// Supabase/PostgREST's default 1000-row page. Ordered by recency, that
// meant anything older than the ~1000 most recent messages was
// invisible to keyword search no matter how relevant, and the blind
// spot only grew as more history accumulated.
//
// Each keyword gets its own query (not one `.or()` across all of them)
// so it gets its own independent row budget — a single common word
// mixed into a shared OR query would otherwise flood the (also
// row-capped) result with its own recent matches and crowd out a rarer
// keyword's genuinely old, relevant ones before they're ever seen.
export async function fetchRelevantDiscordContext(question: string): Promise<string> {
  const keywords = extractKeywords(question).slice(0, MAX_QUERY_KEYWORDS);

  const recentPromise = supabaseServer
    .from("discord_messages")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGE_FLOOR);

  const matchedPromises = keywords.map((kw) =>
    supabaseServer
      .from("discord_messages")
      .select(SELECT_COLUMNS)
      .ilike("content", `%${kw}%`)
      .order("created_at", { ascending: false })
      .limit(MATCHED_ROW_LIMIT_PER_KEYWORD),
  );

  const [recentResult, ...matchedResults] = await Promise.all([recentPromise, ...matchedPromises]);

  if (recentResult.error) throw recentResult.error;
  for (const r of matchedResults) {
    if (r.error) throw r.error;
  }
  const recent = recentResult.data ?? [];
  if (recent.length === 0 && matchedResults.every((r) => (r.data ?? []).length === 0)) return "";

  const toLine = (m: DiscordMessageRow) =>
    `[${m.created_at}] #${m.channel_name} ${m.author_username}: ${m.content}`;

  const seen = new Set<string>();
  const selected: DiscordMessageRow[] = [];
  let totalChars = 0;
  const addUpToBudget = (rows: DiscordMessageRow[]) => {
    for (const m of rows) {
      if (seen.has(m.id)) continue;
      const lineLength = toLine(m).length + 1;
      if (totalChars + lineLength > CONTEXT_CHAR_BUDGET) return;
      seen.add(m.id);
      selected.push(m);
      totalChars += lineLength;
    }
  };

  // The recent floor is always included first — it's small (150 rows)
  // and its whole purpose is ambient context regardless of relevance.
  addUpToBudget(recent);

  // A common English word that isn't a literal stopword ("best", "way",
  // "back") can still match hundreds of messages in a natural-language
  // question, and with each keyword queried independently (see below),
  // their combined union regularly overflows the budget well before
  // covering every keyword — a plain oldest-first trim at that point
  // would cut exactly the old, specific matches this function exists to
  // surface. Filling in ascending order of each keyword's own match
  // count instead means the rarest, most specific terms (a hero name, a
  // one-off phrase) claim their budget first; only once those are fully
  // included does a common word get a chance to contribute, so if
  // something has to be dropped, it's the low-confidence generic
  // matches, not an arbitrary chronological slice that's just as likely
  // to cut the single most relevant hit as the least.
  const byKeyword = matchedResults.map((r) => r.data ?? []).sort((a, b) => a.length - b.length);
  for (const rows of byKeyword) {
    addUpToBudget(rows);
  }

  selected.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return selected.map(toLine).join("\n");
}
