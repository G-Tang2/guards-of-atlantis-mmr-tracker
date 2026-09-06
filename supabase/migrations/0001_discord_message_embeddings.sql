-- Enables semantic (embedding-based) search over Discord chat history for
-- the chatbot, supplementing the plain keyword substring matching in
-- lib/discordContext.ts. discord_messages is populated by a process
-- outside this repo (see lib/discordContext.ts for context) -- this
-- migration only adds a column and a lookup function, it doesn't touch
-- anything about how rows get inserted.
--
-- Run this once in the Supabase Dashboard's SQL Editor, then run
-- `node --env-file=.env.local scripts/backfill-discord-embeddings.mjs`
-- to populate the new column for existing rows. There is no ongoing sync
-- for new messages (see the script's own header comment) -- this is a
-- one-time backfill by design.

create extension if not exists vector;

-- 768 dimensions, truncated from gemini-embedding-2's native 3072 via the
-- API's outputDimensionality param (see lib/gemini.ts's EMBEDDING_MODEL /
-- EMBEDDING_DIMENSIONS). Must match exactly what the backfill script and
-- the runtime query-embedding call both use, or cosine distance between
-- a query vector and these stored vectors is meaningless.
alter table discord_messages
  add column if not exists embedding vector(768);

-- No index (ivfflat/hnsw) for now -- at ~29k rows, a brute-force
-- `ORDER BY embedding <=> query_embedding LIMIT n` scan is fast enough,
-- and an ivfflat index built before the backfill populates any vectors
-- would train on empty data and cluster poorly. If the table grows much
-- larger and this becomes a real latency problem, add one afterward, e.g.:
--   create index discord_messages_embedding_idx on discord_messages
--     using ivfflat (embedding vector_cosine_ops) with (lists = 30);

-- RPC wrapper so the app can run a vector similarity search through
-- supabase-js's .rpc() call -- there's no way to express
-- `ORDER BY embedding <=> $1` through the regular query builder.
create or replace function match_discord_messages(
  query_embedding vector(768),
  match_count int
)
returns table (
  id bigint,
  channel_name text,
  author_username text,
  content text,
  created_at timestamptz
)
language sql stable
as $$
  select id, channel_name, author_username, content, created_at
  from discord_messages
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
