-- Stores the Oracle-generated "Draft Analysis" shown at the bottom of a
-- match's detail page (see app/matches/[id]/page.tsx and
-- app/api/matches/[id]/draft-analysis/route.ts) — generated once, on
-- demand, and cached here rather than regenerated on every page view
-- (each generation is a real Gemini call, same cost/latency profile as
-- an Oracle chat reply).
--
-- Run this once in the Supabase Dashboard's SQL Editor.

alter table matches add column if not exists draft_analysis text;
alter table matches add column if not exists draft_analysis_generated_at timestamptz;
