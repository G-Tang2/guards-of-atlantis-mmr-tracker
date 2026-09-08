// One-time backfill: embeds every discord_messages row that doesn't yet
// have an embedding, via Gemini's embedding API, so lib/discordContext.ts
// can do semantic similarity search alongside its existing keyword match.
// Run supabase/migrations/0001_discord_message_embeddings.sql first (via
// the Supabase Dashboard's SQL Editor) — this script assumes the
// `embedding` column and `match_discord_messages` function already exist.
//
// There is deliberately no ongoing sync for messages that arrive AFTER
// this runs: this repo doesn't control whatever writes to
// discord_messages (see lib/discordContext.ts's own header comment for
// why), so "keep embedding new rows automatically" would need a
// recurring job hooked into that unknown external process. Instead,
// re-run this script by hand whenever you want to catch newly-arrived
// messages up — it's idempotent and safe to re-run (it only ever
// touches rows where embedding IS NULL).
//
// Usage: node --env-file=.env.local scripts/backfill-discord-embeddings.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/backfill-discord-embeddings.mjs");
  process.exit(1);
}

// Must match lib/gemini.ts's EMBEDDING_MODEL/EMBEDDING_DIMENSIONS exactly
// — those are used to embed the user's question at chat time, and a
// mismatch here would make the stored vectors incomparable to it.
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// The free tier's embedding quota (confirmed against the live API, not
// guessed) is EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier
// = 1000 — a hard DAILY cap, not a per-minute one. That's a fundamentally
// different failure mode from generateContent's per-minute cap this app
// hit elsewhere: once it's exhausted, no amount of short-delay retrying
// helps (it won't reset for hours), so a 429 whose quotaId contains
// "PerDay" fails the whole run immediately instead of retrying — see
// isDailyQuotaError below. A first real backfill run hit exactly this: it
// got through ~1000 rows, then spent ~15 minutes retrying with 27-59s
// waits before giving up, none of which could have possibly succeeded.
//
// At 1000/day, backfilling this table's ~28.6k rows takes ~29 daily runs,
// not one sitting — see the script's own final log line for what that
// means for finishing the whole table.
const BATCH_SIZE = 100; // rows fetched from Supabase per round
// Defaults to sequential — on the free tier, the binding constraint is a
// daily REQUEST COUNT, not a rate, so concurrency doesn't help there and
// only spends the day's budget faster before you can see it happening.
// Once billing is enabled, that specific constraint is gone and the
// remaining limit is presumably a per-minute rate, which concurrency
// genuinely helps saturate — override via EMBED_CONCURRENCY=N for a paid
// run rather than changing the safe default everyone else gets.
const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY) || 1;
const MAX_CONTENT_CHARS = 8000; // defensive only — real Discord messages are short
const MAX_RETRIES = 3;

// Below this length, a message is almost always a reaction/filler rather
// than something worth a real embedding — spending one of the day's 1000
// requests on "lol"/"Oh"/"Yep" doesn't buy any real search value. Chosen
// by sampling the actual table (not guessed): 12 catches ~5% of all
// messages (single-word reactions, custom-emoji tags like ":Ursafar:",
// one-line acknowledgments) while a query-checked pass at 20 already
// starts cutting genuine game-discussion lines ("tali is great", "It
// breaks the game", "depends on the comp") — worth explicitly NOT doing,
// since those are exactly the kind of content semantic search exists for.
const MIN_CONTENT_LENGTH = 12;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// A short message isn't the only kind of low-value content — one that's
// entirely emoji/punctuation with no actual word in it (e.g. "😂😂😂",
// "???", ":rollingeyes:" once trimmed of any surrounding text) carries
// the same "pure reaction" character regardless of length.
function isLowValueMessage(content) {
  const trimmed = content.trim();
  if (trimmed.length < MIN_CONTENT_LENGTH) return true;
  if (!/[a-zA-Z0-9]/.test(trimmed)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DailyQuotaExhaustedError extends Error {}

function isDailyQuotaError(body) {
  const violations = body?.error?.details?.find(
    (d) => typeof d["@type"] === "string" && d["@type"].includes("QuotaFailure"),
  )?.violations;
  return Array.isArray(violations) && violations.some((v) => typeof v.quotaId === "string" && v.quotaId.includes("PerDay"));
}

async function embedOne(text, attempt = 1) {
  const res = await fetch(`${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (res.status === 429) {
    const body = await res.json().catch(() => null);
    if (isDailyQuotaError(body)) {
      throw new DailyQuotaExhaustedError("Daily embedding quota exhausted.");
    }
    if (attempt > MAX_RETRIES) {
      throw new Error("Gave up after repeated 429s - re-run the script later to resume.");
    }
    const retryInfo = body?.error?.details?.find((d) => typeof d["@type"] === "string" && d["@type"].includes("RetryInfo"));
    const waitMs = retryInfo?.retryDelay ? Math.ceil(parseFloat(retryInfo.retryDelay) * 1000) : attempt * 2000;
    console.log(`  rate limited, waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})...`);
    await sleep(waitMs);
    return embedOne(text, attempt + 1);
  }

  // Transient infrastructure errors (a real 503 hit mid-backfill, but 500/
  // 502/504 are the same class) — unlike a 429, there's no quota signal or
  // suggested delay to read, just "try again shortly." Retrying here is
  // what makes a multi-thousand-request run resilient to one blip instead
  // of needing a manual re-run for something that would very likely
  // succeed a few seconds later.
  if (res.status >= 500 && res.status < 600) {
    if (attempt > MAX_RETRIES) {
      throw new Error(`Gave up after repeated ${res.status}s - re-run the script later to resume.`);
    }
    const waitMs = attempt * 2000;
    console.log(`  Gemini returned ${res.status}, waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})...`);
    await sleep(waitMs);
    return embedOne(text, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedContent error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error(`Unexpected embedContent response shape: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return values;
}

async function processBatch(rows) {
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (row) => {
        const text = row.content.slice(0, MAX_CONTENT_CHARS);
        const embedding = await embedOne(text);
        // .select("id") + a length check on the result turns a silently
        // no-op update into a loud failure — discord_messages.id is a
        // Discord snowflake (a bigint well beyond
        // Number.MAX_SAFE_INTEGER), and this row's `id` was already
        // fetched as a precision-safe string (see the `id::text` select
        // below); without that cast, .eq("id", row.id) would compare
        // against a JS-rounded id that matches zero real rows, and
        // .update() reports that as success (no error) rather than a
        // failure, silently discarding the embedding while still
        // spending the day's request quota on it. This bug shipped
        // originally and burned two full days of quota (~2000 requests)
        // before being caught — only 3 rows had actually persisted.
        const { data, error } = await supabase
          .from("discord_messages")
          .update({ embedding })
          .eq("id", row.id)
          .select("id");
        if (error) {
          throw new Error(`Failed to save embedding for row ${row.id}: ${error.message}`);
        }
        if (!data || data.length === 0) {
          throw new Error(`Update matched 0 rows for id ${row.id} — this should be impossible; stopping rather than silently wasting more quota.`);
        }
      }),
    );
  }
}

async function countRemaining() {
  const { count, error } = await supabase
    .from("discord_messages")
    .select("*", { count: "exact", head: true })
    .is("embedding", null)
    .not("content", "is", null)
    .neq("content", "");
  if (error) return null;
  return count;
}

async function main() {
  let totalEmbedded = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  // Advances past every row this run has SEEN (embedded or skipped),
  // unlike the old "always re-query embedding IS NULL from the top"
  // approach — a low-value row never gets an embedding, so it always
  // matches that filter, and without a cursor a batch that happened to be
  // entirely low-value would re-fetch the exact same rows forever. This
  // cursor only lives for this one run, though: a fresh run tomorrow
  // starts back at the top and re-skips the same low-value rows again
  // (cheap — a handful of extra fetches, zero extra API calls) before
  // reaching whatever's genuinely new. That's an acceptable, bounded cost
  // for not needing a schema change to persist a "skip" marker.
  let cursorId = null;

  for (;;) {
    // "id::text" (a PostgREST cast), not plain "id" — discord_messages.id
    // is a bigint Discord snowflake that exceeds Number.MAX_SAFE_INTEGER,
    // so deserializing it as a JS number rounds it to a different value.
    // See the matching comment in processBatch for what that silently
    // broke before this was caught.
    let query = supabase
      .from("discord_messages")
      .select("id::text, content")
      .is("embedding", null)
      .not("content", "is", null)
      .neq("content", "")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);
    if (cursorId !== null) query = query.gt("id", cursorId);

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to fetch batch:", error);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    cursorId = rows[rows.length - 1].id;

    const toEmbed = rows.filter((r) => !isLowValueMessage(r.content));
    totalSkipped += rows.length - toEmbed.length;

    try {
      await processBatch(toEmbed);
    } catch (err) {
      if (err instanceof DailyQuotaExhaustedError) {
        const remaining = await countRemaining();
        console.log(
          `Embedded ${totalEmbedded} messages this run (skipped ${totalSkipped} low-value ones) before hitting the daily quota (1000 requests/day, free tier).`,
        );
        console.log(
          remaining !== null
            ? `${remaining} messages still show as not-embedded (a portion of those will keep being skipped as low-value, not spend real requests) - re-run this same command again after the quota resets (roughly 24h from when you started today's run).`
            : `Re-run this same command again after the quota resets (roughly 24h from when you started today's run) to continue.`,
        );
        return;
      }
      throw err;
    }
    totalEmbedded += toEmbed.length;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`Embedded ${totalEmbedded} messages so far (skipped ${totalSkipped} low-value, ${elapsedSec}s elapsed)...`);
  }

  console.log(
    `Done. Embedded ${totalEmbedded} messages (skipped ${totalSkipped} low-value) in ${((Date.now() - startTime) / 1000).toFixed(0)}s.`,
  );
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
