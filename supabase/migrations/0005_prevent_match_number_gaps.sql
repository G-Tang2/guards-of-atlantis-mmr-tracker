-- matches.match_number currently auto-numbers via a Postgres
-- sequence/identity default. Sequences are non-transactional: the moment
-- an insert's defaults are evaluated, the number is consumed for good —
-- even if that same insert then fails a check constraint and rolls back
-- (see app/matches/new/page.tsx's gamesSincePlayed comment, which already
-- documents this and works around it by counting real rows rather than
-- doing arithmetic on the numbers). This migration replaces that with a
-- BEFORE INSERT trigger that assigns "one more than the current max" —
-- a failed insert then never touches numbering at all, since only a row
-- that actually lands consumes a number — and, in the same run, compacts
-- every existing match_number down to a dense 1..N sequence (same
-- relative/chronological order they already had) to close whatever gaps
-- are already there.
--
-- Run this once in the Supabase Dashboard's SQL Editor. Safe to re-run —
-- numbers already dense are left untouched, and CREATE OR REPLACE /
-- DROP ... IF EXISTS make the rest idempotent too.

begin;

-- match_number might currently be `generated always as identity` or a
-- plain integer with a nextval() default — handle whichever it is.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'matches' and column_name = 'match_number'
      and is_identity = 'YES'
  ) then
    execute 'alter table matches alter column match_number drop identity';
  else
    execute 'alter table matches alter column match_number drop default';
  end if;
end $$;

-- Drop the uniqueness constraint (added back below) for the duration of
-- the bulk renumber — otherwise Postgres checks it row-by-row mid-
-- statement, and shifting numbers downward collides with a not-yet-
-- updated row still holding the target number.
alter table matches drop constraint if exists matches_match_number_key;

-- Compact existing match_number values to a dense 1..N sequence, keeping
-- their current relative order. match_players.match_number is a
-- denormalized copy (see app/matches/new/page.tsx) and is kept in sync
-- in the same transaction.
with renumbered as (
  select id, row_number() over (order by match_number) as new_number
  from matches
)
update matches m
set match_number = r.new_number
from renumbered r
where r.id = m.id;

update match_players mp
set match_number = m.match_number
from matches m
where m.id = mp.match_id;

-- Guards against a duplicate number if two matches are ever recorded in
-- the same instant (see the advisory lock in the trigger function below,
-- which is the primary defense against that) — belt and suspenders.
alter table matches add constraint matches_match_number_key unique (match_number);

create or replace function set_match_number()
returns trigger as $$
begin
  if new.match_number is null then
    -- Transaction-scoped advisory lock (auto-released at commit/rollback)
    -- serializes concurrent inserts so two simultaneous "Record Battle"
    -- saves can't both compute the same next number.
    perform pg_advisory_xact_lock(hashtext('matches_match_number'));
    select coalesce(max(match_number), 0) + 1 into new.match_number from matches;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_match_number on matches;
create trigger trg_set_match_number
before insert on matches
for each row
execute function set_match_number();

commit;
