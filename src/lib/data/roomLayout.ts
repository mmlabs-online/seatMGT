/**
 * Data seam for the Room Layout Editor v2 (free-form). Read side only — kept
 * separate from `src/lib/data/index.ts` so no existing data function changes.
 * Mutations live in `src/lib/actions/roomLayout.ts`.
 *
 * SEED RULE (the whole point of v2): a room opened for the first time in the
 * new editor must show the SAME arrangement as the original editor. So when a
 * seat has no free-form `x/y` yet, we seed from the original editor's truth:
 *   1. `Seat.x/y`            — set once the free-form editor has saved.
 *   2. `Seat.posX/posY`      — the ORIGINAL editor's pixel positions (main path).
 *   3. `Seat.col/row`        — my v1 grid editor (converted at GRID_CELL).
 *   4. seqNo-derived grid    — brand-new seats with nothing stored.
 * Fixtures seed the same way: `Room.layoutFixtures` if present, otherwise the
 * original editor's `Room.layoutMeta.features` (Door/Window) so those carry over.
 *
 * Occupancy/status/device-count are read as DERIVED, read-only values.
 */
import "server-only";
import { prisma } from "@/lib/db";
import {
  FIXTURE_META,
  GRID_CELL,
  SEAT_H,
  SEAT_PITCH,
  SEAT_W,
  type Fixture,
  type FixtureType,
  type RoomLayoutData,
  type SeatWithLayout,
} from "@/lib/roomLayout";

const FIXTURE_TYPES = new Set<FixtureType>([
  "door",
  "window",
  "room",
  "stairs",
  "elevator",
  "server",
  "cabinet",
  "pillar",
  "blocked",
  "label",
]);

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Normalize one stored fixture into the free-form pixel shape, converting
 * legacy v1 grid fixtures (`col/row/w/h` in cells) if that's what's stored. */
function normalizeFixture(raw: unknown): Fixture | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== "string" || typeof f.type !== "string" || !FIXTURE_TYPES.has(f.type as FixtureType)) {
    return null;
  }
  const type = f.type as FixtureType;
  const meta = FIXTURE_META[type];

  // Free-form (v2) if it has pixel x/y; else legacy grid (v1) via col/row.
  const px = num(f.x);
  const py = num(f.y);
  if (px !== undefined && py !== undefined) {
    return {
      id: f.id,
      type,
      x: px,
      y: py,
      w: num(f.w) ?? meta.w,
      h: num(f.h) ?? meta.h,
      rotation: num(f.rotation) ?? 0,
      label: typeof f.label === "string" ? f.label : undefined,
      color: typeof f.color === "string" ? f.color : meta.color,
    };
  }
  const col = num(f.col);
  const row = num(f.row);
  if (col !== undefined && row !== undefined) {
    return {
      id: f.id,
      type,
      x: col * GRID_CELL,
      y: row * GRID_CELL,
      w: (num(f.w) ?? 1) * GRID_CELL,
      h: (num(f.h) ?? 1) * GRID_CELL,
      rotation: 0,
      label: typeof f.label === "string" ? f.label : undefined,
      color: typeof f.color === "string" ? f.color : meta.color,
    };
  }
  return null;
}

/** Seed fixtures from the ORIGINAL editor's `layoutMeta.features` (Door/Window
 * markers, pixel posX/posY) so they appear in the new editor unchanged. */
function fixturesFromFeatures(features: unknown): Fixture[] {
  if (!Array.isArray(features)) return [];
  const out: Fixture[] = [];
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const type = f.type as FixtureType;
    if (typeof f.id !== "string" || !FIXTURE_TYPES.has(type)) continue;
    const meta = FIXTURE_META[type];
    out.push({
      id: f.id,
      type,
      x: num(f.posX) ?? 0,
      y: num(f.posY) ?? 0,
      w: meta.w,
      h: meta.h,
      rotation: 0,
      color: meta.color,
    });
  }
  return out;
}

/** Full free-form layout for one room. Returns `null` if the room is gone. */
export async function getRoomLayout(roomId: string): Promise<RoomLayoutData | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      seats: {
        orderBy: { seqNo: "asc" },
        include: { occupant: true, group: true, _count: { select: { devices: true } } },
      },
    },
  });
  if (!room) return null;

  const meta = (room.layoutMeta as { floor?: string; features?: unknown } | null) ?? {};

  const seats: SeatWithLayout[] = room.seats.map((s, i) => {
    // Resolve free-form coords through the seed chain (see file header).
    let x: number;
    let y: number;
    if (s.x != null && s.y != null) {
      x = s.x;
      y = s.y;
    } else if (s.posX !== 0 || s.posY !== 0) {
      x = s.posX; // ORIGINAL editor pixel position — the main carry-over path
      y = s.posY;
    } else if (s.col != null) {
      x = s.col * GRID_CELL;
      y = (s.row ?? 0) * GRID_CELL;
    } else {
      x = (i % 8) * SEAT_PITCH;
      y = Math.floor(i / 8) * SEAT_PITCH;
    }

    return {
      id: s.id,
      code: s.code,
      seqNo: s.seqNo,
      x,
      y,
      rotation: s.rotation,
      w: s.w ?? SEAT_W,
      h: s.h ?? SEAT_H,
      cannotSeat: s.cannotSeat,
      groupId: s.groupId ?? undefined,
      groupName: s.group?.name,
      groupColor: s.group?.color,
      status: s.occupantMemberId ? "occupied" : "empty",
      occupantName: s.occupant?.name,
      deviceCount: s._count.devices,
    };
  });

  // Prefer the v2 store; fall back to the original editor's Door/Window markers.
  const stored = Array.isArray(room.layoutFixtures)
    ? (room.layoutFixtures as unknown[]).map(normalizeFixture).filter((f): f is Fixture => f !== null)
    : [];
  const fixtures = stored.length > 0 ? stored : fixturesFromFeatures(meta.features);

  return {
    room: { id: room.id, code: room.code, name: room.name, floor: meta.floor ?? "" },
    seats,
    fixtures,
  };
}
