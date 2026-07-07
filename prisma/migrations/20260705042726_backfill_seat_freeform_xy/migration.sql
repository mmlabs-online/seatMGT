-- Backfill the free-form Room Layout Editor coordinates so the new (now
-- primary) editor and the free-form room viewer never render a room empty.
--
-- Data-only migration (no schema change). Non-destructive: it only fills NULL
-- Seat.x/y and leaves posX/posY and col/row untouched (those remain as the
-- original/archived editor's data).
--
-- Resolution mirrors getRoomLayout()'s seed chain:
--   1. posX/posY  — the ORIGINAL editor's pixel positions (main carry-over).
--   2. col/row * 64 (GRID_CELL) — my v1 grid editor's cells, if that's all there is.
-- Anything still NULL (a seat with no stored position at all) is left NULL and
-- falls back to a seqNo-derived grid at read time.

UPDATE "Seat"
SET "x" = "posX", "y" = "posY"
WHERE "x" IS NULL AND ("posX" <> 0 OR "posY" <> 0);

UPDATE "Seat"
SET "x" = "col" * 64, "y" = "row" * 64
WHERE "x" IS NULL AND "col" IS NOT NULL AND "row" IS NOT NULL;
