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

const BATCH_SIZE = 100; // rows fetched from Supabase per round
const CONCURRENCY = 5; // simultaneous embedding requests within a batch
const MAX_CONTENT_CHARS = 8000; // defensive only — real Discord messages are short
const MAX_RETRIES = 6;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (attempt > MAX_RETRIES) {
      throw new Error("Gave up after repeated 429s — re-run the script later to resume.");
    }
    const body = await res.json().catch(() => null);
    const retryInfo = body?.error?.details?.find((d) => typeof d["@type"] === "string" && d["@type"].includes("RetryInfo"));
    const waitMs = retryInfo?.retryDelay ? Math.ceil(parseFloat(retryInfo.retryDelay) * 1000) : attempt * 2000;
    console.log(`  rate limited, waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})...`);
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
        const { error } = await supabase.from("discord_messages").update({ embedding }).eq("id", row.id);
        if (error) {
          throw new Error(`Failed to save embedding for row ${row.id}: ${error.message}`);
        }
      }),
    );
  }
}

async function main() {
  let totalDone = 0;
  const startTime = Date.now();

  for (;;) {
    // Always re-queries the same filter from the top rather than paging
    // with a growing offset — every row this returns either gets an
    // embedding (and drops out of the WHERE clause) or the script throws,
    // so "the next unprocessed batch" is always just whatever this same
    // query returns next time. That's what makes the script safely
    // resumable after an interruption or a hard failure.
    const { data: rows, error } = await supabase
      .from("discord_messages")
      .select("id, content")
      .is("embedding", null)
      .not("content", "is", null)
      .neq("content", "")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error("Failed to fetch batch:", error);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    await processBatch(rows);
    totalDone += rows.length;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`Embedded ${totalDone} messages so far (${elapsedSec}s elapsed)...`);
  }

  console.log(`Done. Embedded ${totalDone} messages in ${((Date.now() - startTime) / 1000).toFixed(0)}s.`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
