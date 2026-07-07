-- Enforce "one primary device per seat" at the database level. Prisma can't
-- express a partial unique index, so it's added here as a raw migration.
CREATE UNIQUE INDEX one_primary_per_seat
ON "Device"("seatId") WHERE role = 'PRIMARY' AND "seatId" IS NOT NULL;
