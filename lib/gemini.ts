import { ChatTurn } from "@/lib/chat";

// GEMINI_MODEL defaults to the Flash-Lite tier for lower latency/cost per
// request. Pinned to a specific dated id rather than a rolling "-latest"
// alias — unlike the main Flash tier, no "-lite-latest" alias exists, so
// this may need bumping to a newer dated id if Google retires this one;
// the env var can override it in the meantime without a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Verified directly against the live API (ListModels) rather than
// guessed — this account's only embedding-capable models are
// gemini-embedding-001/2/2-preview, none of which follow the
// "-latest"/dated-id convention GEMINI_MODEL uses above, so there's no
// stable alias to default to; if this one is retired, re-check
// ListModels rather than assuming a similarly-named replacement exists.
// 768 dimensions (truncated from this model's native 3072 via
// outputDimensionality) keeps vectors well under pgvector's ivfflat index
// dimension ceiling and is plenty for a group chat's vocabulary. This
// value and the model id MUST match what
// scripts/backfill-discord-embeddings.mjs used to populate
// discord_messages.embedding (see supabase/migrations/0001_discord_message_embeddings.sql) —
// cosine distance between vectors from different models/dimensions is
// meaningless.
const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;

// Distinguished from a generic failure so the route handler can show the
// user something actionable ("try again in a minute") instead of a
// one-size-fits-all error — Gemini returns 429 for both per-minute and
// per-day quota exhaustion, which this app has hit firsthand.
export class GeminiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reads the same RetryInfo.retryDelay structure the rate-limit responses
// have always carried (see the "Please retry in Ns" message this app hit
// firsthand) — used to decide how long to wait before retrying, rather
// than guessing a fixed backoff.
function parseRetryDelayMs(body: string): number | null {
  try {
    const json = JSON.parse(body);
    const details = json?.error?.details;
    if (!Array.isArray(details)) return null;
    const retryInfo = details.find(
      (d) => typeof d?.["@type"] === "string" && d["@type"].includes("RetryInfo"),
    );
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay !== "string") return null;
    const seconds = parseFloat(retryDelay);
    return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
  } catch {
    return null;
  }
}

// Only auto-retry a wait this short or less. The route handler streams
// its response, so the whole request (this call plus everything before
// it — Discord/rulebook lookups, embedding the question, counting
// tokens) shares one function-execution budget (see maxDuration in
// app/api/chat/route.ts); waiting out a long quota-reset delay here would
// just trade a fast, clear rate-limit error for a slow, confusing
// function-timeout error once that budget runs out.
const MAX_AUTO_RETRY_DELAY_MS = 40_000;

// Establishes the streaming connection, retrying once on a 429 whose
// suggested wait is short enough to still fit the route's time budget —
// this happens before anything is read from the response body, so a
// retry here never has to un-send partial content to our own client.
async function openChatReplyStream(apiKey: string, requestBody: string, attempt = 1): Promise<Response> {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    },
  );

  if (res.ok) return res;

  const body = await res.text();
  if (res.status === 429) {
    const retryDelayMs = attempt === 1 ? parseRetryDelayMs(body) : null;
    if (retryDelayMs !== null && retryDelayMs <= MAX_AUTO_RETRY_DELAY_MS) {
      await sleep(retryDelayMs);
      return openChatReplyStream(apiKey, requestBody, attempt + 1);
    }
    throw new GeminiRateLimitError(`Gemini API rate limit: ${body}`);
  }
  throw new Error(`Gemini API error ${res.status}: ${body}`);
}

// Plain REST call rather than the @google/genai SDK — this
// streamGenerateContent request shape is Google's long-stable public REST
// contract, and using it directly avoids adding an SDK dependency (and
// its own version/API-shape churn) for what's a handful of HTTP calls.
//
// Yields incremental reply text as Gemini generates it (via
// streamGenerateContent's Server-Sent-Events response, alt=sse) instead
// of returning the complete reply in one shot — lets the route handler
// relay each piece to the client as it arrives rather than the user
// staring at a blank "Thinking…" state for the reply's entire generation
// time.
export async function* streamChatReply({
  systemInstruction,
  history,
  message,
}: {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
}): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const contents = [
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    // Low, not zero — 0 can make some Gemini models loop/degrade on
    // longer outputs. This is a mitigation, not a guarantee: a lower
    // temperature makes the model more literal about reciting facts
    // already in its context, but it doesn't eliminate the
    // possibility of a wrong synthesis on any given answer.
    generationConfig: { temperature: 0.1 },
  });

  const res = await openChatReplyStream(apiKey, requestBody);
  if (!res.body) {
    throw new Error("Gemini API returned no response body");
  }

  // alt=sse frames each partial GenerateContentResponse as one or more
  // "data: <json>" lines. Each payload's text is that chunk's own
  // incremental delta (not a running total), so yielding each one as it
  // arrives is exactly the text to append to what's already been shown.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data:")) continue;
      const jsonText = line.slice(5).trim();
      if (!jsonText) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        continue;
      }
      const text = (parsed as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        ?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === "string" && text.length > 0) {
        yield text;
      }
    }
  }
}

// Exact token count from Gemini's own tokenizer, used to size the
// Discord-history budget precisely (see TOTAL_CONTEXT_TOKEN_BUDGET in
// app/api/chat/route.ts) instead of guessing via a ~4-chars-per-token
// heuristic. Best-effort only — returns null on any failure (missing key,
// network error, non-OK response, unexpected shape) rather than throwing,
// since this is a budgeting optimization, not a requirement: the caller
// falls back to the char-based heuristic, and a chat reply should never
// fail just because this side call did.
export async function countTokens(text: string): Promise<number | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:countTokens?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.totalTokens === "number" ? data.totalTokens : null;
  } catch {
    return null;
  }
}

// "RETRIEVAL_QUERY" for embedding the user's question at chat time,
// "RETRIEVAL_DOCUMENT" for embedding stored Discord messages (used by the
// backfill script, not this function, but kept here as the source of
// truth for the value) — these embedding models are asymmetric, trained
// so a query and the documents it should match don't need to look
// textually similar, but only when each side is embedded with its own
// correct task type.
export type EmbeddingTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

// Best-effort only, same reasoning as countTokens — returns null on any
// failure so semantic search degrades to the existing keyword-only
// matching in lib/discordContext.ts rather than ever blocking a reply.
export async function embedText(text: string, taskType: EmbeddingTaskType): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}
