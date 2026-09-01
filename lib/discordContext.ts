import { supabaseServer } from "@/lib/supabase/server";

// Hard ceiling only — the keyword pre-filter below is what normally keeps
// a request far under this; it only matters if a question happens to
// match an unusually large chunk of the history. Estimated via a rough
// ~4-characters-per-token heuristic rather than a real tokenizer. Kept
// deliberately tight (along with the rulebook and hero-card contexts) so
// a single request stays well under Gemini's per-minute token limit even
// when a few messages go out in quick succession.
const CONTEXT_TOKEN_BUDGET = 200_000;
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * 4;

// Always included regardless of keyword relevance, so the bot still has
// some ambient context for a vague question ("what's new?") that doesn't
// match specific words.
const RECENT_MESSAGE_FLOOR = 150;

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

// Sends Gemini a keyword-relevant slice of the Discord history instead of
// the whole table every time — the table can hold an entire server's
// history, but a given question rarely needs more than a small fraction
// of it. Plain substring matching, not embeddings/vector search — cheap,
// dependency-free, and good enough at this data scale.
export async function fetchRelevantDiscordContext(question: string): Promise<string> {
  const { data, error } = await supabaseServer
    .from("discord_messages")
    .select("id, channel_name, author_username, content, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return "";

  const keywords = extractKeywords(question);
  const matched = keywords.length
    ? data.filter((m) => {
        const lower = m.content.toLowerCase();
        return keywords.some((kw) => lower.includes(kw));
      })
    : [];

  // Union of keyword-matched messages and the most recent N, deduped by
  // id — grounds the bot in specific relevant history *and* general
  // recent activity, without sending the whole table.
  const seen = new Set<string>();
  const selected: DiscordMessageRow[] = [];
  for (const m of [...matched, ...data.slice(0, RECENT_MESSAGE_FLOOR)]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    selected.push(m);
  }

  // Chronological order reads better for the model than a
  // relevance-ranked jumble; the char budget is a last-resort trim from
  // the oldest end if an unusually broad match still overflows it.
  selected.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lines = selected.map(
    (m) => `[${m.created_at}] #${m.channel_name} ${m.author_username}: ${m.content}`,
  );

  let totalChars = lines.reduce((s, l) => s + l.length + 1, 0);
  let start = 0;
  while (totalChars > CONTEXT_CHAR_BUDGET && start < lines.length) {
    totalChars -= lines[start].length + 1;
    start++;
  }

  return lines.slice(start).join("\n");
}
