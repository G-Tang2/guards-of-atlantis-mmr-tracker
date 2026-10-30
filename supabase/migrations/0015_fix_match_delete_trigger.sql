-- A match delete is supposed to keep match_number (and the two places
-- that denormalize it — match_players.match_number and
-- players.last_played_match_number) dense, the same way migration 0005
-- keeps it dense after an insert. Two different AFTER DELETE triggers
-- already existed for this on the live database, both added directly via
-- the SQL Editor at some point outside any tracked migration:
-- renumber_matches_after_delete() (correct, kept below) and
-- reindex_match_numbers() (redundant with it, and broken — its first
-- pass ran `update matches set match_number = -match_number;` with no
-- WHERE clause at all, which Supabase's own safe-update guard rejects
-- outright with "UPDATE requires a WHERE clause" — so *every* delete on
-- matches failed before the row itself was ever touched, regardless of
-- which key/role issued it). This drops the broken one and formally
-- tracks the correct one, so a DELETE on matches actually succeeds, and
-- the live schema and this repo agree on what's there.
--
-- Run this once in the Supabase Dashboard's SQL Editor.

drop trigger if exists trg_reindex_match_numbers on matches;
drop function if exists reindex_match_numbers();

create or replace function renumber_matches_after_delete()
returns trigger as $$
begin
  -- Shift every match after the deleted one down by one, and keep the two
  -- places that reference match_number in sync with the same shift.
  update matches
    set match_number = match_number - 1
    where match_number > old.match_number;

  update match_players
    set match_number = match_number - 1
    where match_number > old.match_number;

  update players
    set last_played_match_number = last_played_match_number - 1
    where last_played_match_number > old.match_number;

  -- match_number has had no real sequence backing it since migration
  -- 0005 (set_match_number() computes max+1 directly instead) — no
  -- setval call here, since pg_get_serial_sequence would just return
  -- null for it now and there'd be nothing to sync anyway.

  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_renumber_matches_after_delete on matches;
create trigger trg_renumber_matches_after_delete
after delete on matches
for each row
execute function renumber_matches_after_delete();
