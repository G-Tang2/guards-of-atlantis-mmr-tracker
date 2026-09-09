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

// Distinguished from GeminiRateLimitError/a generic failure so the route
// handler can tell the user the honest reason nothing arrived in time —
// "the Oracle is slow right now" rather than "rate limited" or a bare
// failure, since the underlying cause here is specifically that
// firstChunkDeadlineAt (see streamChatReply) passed before a connection
// was established, not that the request was ever rejected outright.
export class GeminiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiTimeoutError";
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

// Bounds the 5xx retry below — a real "high demand"/transient-outage
// blip clears within a few seconds, and unlike the 429 case there's no
// quota signal to read a real wait time from, so this is just enough
// attempts to smooth over a blip without eating meaningfully into the
// route's 60s time budget (maxDuration in app/api/chat/route.ts).
const MAX_5XX_RETRIES = 2;

// Establishes the streaming connection, retrying once on a 429 whose
// suggested wait is short enough to still fit the route's time budget,
// or a bounded few times on a 5xx (transient infra error/high demand —
// hit live in practice: "This model is currently experiencing high
// demand", same class this app already retries in
// scripts/backfill-discord-embeddings.mjs). Both happen before anything
// is read from the response body, so a retry here never has to un-send
// partial content to our own client.
//
// firstChunkDeadlineAt (an absolute Date.now()-style timestamp, set once
// at the start of the whole chat request — see app/api/chat/route.ts)
// bounds every attempt and every retry wait here: this app promises the
// UI a reply starts streaming within a fixed window, not "eventually" —
// a real 158-second wait was observed live during a Gemini high-demand
// spike before this existed, with nothing stopping the retries from
// chasing it that long. Once the deadline would be blown by either the
// connection attempt itself or the next retry's wait, this gives up with
// GeminiTimeoutError instead of continuing to wait.
async function openChatReplyStream(
  apiKey: string,
  requestBody: string,
  firstChunkDeadlineAt: number,
  attempt = 1,
): Promise<Response> {
  const remainingMs = firstChunkDeadlineAt - Date.now();
  if (remainingMs <= 0) {
    throw new GeminiTimeoutError("Timed out waiting for the Oracle to start responding.");
  }

  const abortController = new AbortController();
  const abortTimer = setTimeout(() => abortController.abort(), remainingMs);
  let res: Response;
  try {
    res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: abortController.signal,
      },
    );
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new GeminiTimeoutError("Timed out waiting for the Oracle to start responding.");
    }
    throw e;
  } finally {
    clearTimeout(abortTimer);
  }

  if (res.ok) return res;

  const body = await res.text();
  if (res.status === 429) {
    const retryDelayMs = attempt === 1 ? parseRetryDelayMs(body) : null;
    if (
      retryDelayMs !== null &&
      retryDelayMs <= MAX_AUTO_RETRY_DELAY_MS &&
      Date.now() + retryDelayMs < firstChunkDeadlineAt
    ) {
      await sleep(retryDelayMs);
      return openChatReplyStream(apiKey, requestBody, firstChunkDeadlineAt, attempt + 1);
    }
    throw new GeminiRateLimitError(`Gemini API rate limit: ${body}`);
  }
  if (res.status >= 500 && res.status < 600 && attempt <= MAX_5XX_RETRIES) {
    const retryDelayMs = attempt * 1500;
    if (Date.now() + retryDelayMs < firstChunkDeadlineAt) {
      await sleep(retryDelayMs);
      return openChatReplyStream(apiKey, requestBody, firstChunkDeadlineAt, attempt + 1);
    }
    throw new GeminiTimeoutError(`Gemini API error ${res.status}, no time left to retry: ${body}`);
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
  firstChunkDeadlineAt,
}: {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
  // Absolute Date.now()-style deadline for the reply to start streaming
  // by — see openChatReplyStream's own comment for why this exists.
  firstChunkDeadlineAt: number;
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
    // temperature 0 alone still leaves some residual sampling variance on
    // Gemini's hosted infra (verified: 5 identical calls at temp 0 gave
    // 4 matching + 1 different verdict on a close judgment call). Adding
    // a fixed seed on top closed that gap completely in testing — 5
    // calls with temperature 0 + this same seed came back byte-for-byte
    // identical. The seed doesn't need to mean anything; it just has to
    // stay fixed so the same question keeps landing on the same sampling
    // path. Watch for looping/degradation on long outputs if this ever
    // gets flaky — that's the known failure mode temperature 0 can
    // trigger on some Gemini models, though the live tests showed no
    // sign of it.
    generationConfig: { temperature: 0, seed: 1 },
  });

  const res = await openChatReplyStream(apiKey, requestBody, firstChunkDeadlineAt);
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

// Exact-string cache for countTokens results below. The text this app
// actually passes in (see nonDiscordSystemInstructionSoFar in
// app/api/chat/route.ts) is built from a small, recurring set of
// hero-card/guide/rulebook sections, not arbitrary free text — every
// "how do I play Bain?"-style question produces byte-identical text here
// regardless of who asks or when. A plain in-memory Map survives across
// requests on a warm server instance, so most calls become a cache hit
// and skip the network round trip entirely. Capped and reset wholesale
// rather than evicted one entry at a time — simplest way to bound memory
// if something unexpected ever pushes the cardinality higher than
// expected, without needing real LRU bookkeeping for what's normally a
// tiny, self-limiting cache.
const MAX_TOKEN_COUNT_CACHE_ENTRIES = 500;
const tokenCountCache = new Map<string, number>();

// Exact token count from Gemini's own tokenizer, used to size the
// Discord-history budget precisely (see TOTAL_CONTEXT_TOKEN_BUDGET in
// app/api/chat/route.ts) instead of guessing via a ~4-chars-per-token
// heuristic. Best-effort only — returns null on any failure (missing key,
// network error, non-OK response, unexpected shape) rather than throwing,
// since this is a budgeting optimization, not a requirement: the caller
// falls back to the char-based heuristic, and a chat reply should never
// fail just because this side call did.
export async function countTokens(text: string): Promise<number | null> {
  const cached = tokenCountCache.get(text);
  if (cached !== undefined) return cached;

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
    const totalTokens = typeof data?.totalTokens === "number" ? data.totalTokens : null;
    if (totalTokens !== null) {
      if (tokenCountCache.size >= MAX_TOKEN_COUNT_CACHE_ENTRIES) tokenCountCache.clear();
      tokenCountCache.set(text, totalTokens);
    }
    return totalTokens;
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
