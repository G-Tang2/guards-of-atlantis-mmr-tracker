-- The keyword substring search in lib/discordContext.ts
-- (fetchDiscordCandidates) queries `content ilike '%keyword%'` for each
-- extracted keyword -- a leading wildcard means Postgres can't use a plain
-- btree index and falls back to a sequential scan over the whole table.
-- Live timing (same session as 0002_discord_message_embedding_index.sql)
-- showed each keyword's query taking ~2.4-2.8s over this table's ~29k
-- rows -- now the leading cost in a chat request's Discord-context fetch,
-- since that migration already fixed the semantic search RPC's own
-- latency.
--
-- pg_trgm's GIN index breaks text into trigrams (overlapping 3-character
-- sequences) and lets the query planner serve a LIKE/ILIKE query with
-- wildcards on both sides directly from the index instead of scanning
-- every row -- exactly this table's access pattern.
--
-- Run this once in the Supabase Dashboard's SQL Editor, same as the prior
-- two migrations in this folder.
create extension if not exists pg_trgm;

create index if not exists discord_messages_content_trgm_idx on discord_messages
  using gin (content gin_trgm_ops);
