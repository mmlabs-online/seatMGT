"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { FEATURE_TILE_HEIGHT, FEATURE_TILE_WIDTH, generateLayout, roomBounds, snapToBorder } from "@/lib/layout";
import type { RoomFeature, RoomFeatureType } from "@/types";

const idSchema = z.string().min(1);

/** Admin only, per the permission matrix ("CRUD rooms/seats/layout"). */
const roomInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  podCols: z.number().int().positive(),
  seatCount: z.number().int().positive(),
  floor: z.string().min(1),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

type RoomLayoutMeta = {
  podCols: number;
  /** Pod-row capacity ("available space" / walls) — independent of seatCount. */
  podRows: number;
  seatCount: number;
  floor: string;
  features: RoomFeature[];
};

function readLayoutMeta(layoutMeta: Prisma.JsonValue): RoomLayoutMeta {
  const meta = (layoutMeta as Partial<RoomLayoutMeta> | null) ?? {};
  const podCols = meta.podCols ?? 1;
  const seatCount = meta.seatCount ?? 0;
  return {
    podCols,
    // Rooms written before podRows existed don't have it stored — derive a
    // capacity that's at least big enough to hold every seat already placed.
    podRows: meta.podRows ?? Math.max(1, Math.ceil(seatCount / (podCols * 4))),
    seatCount,
    floor: meta.floor ?? "",
    features: meta.features ?? [],
  };
}

/** `RoomFeature[]` (a named interface array) isn't structurally assignable to
 * Prisma's `InputJsonValue` (needs a string index signature) even though it's
 * valid JSON at runtime — cast at the one boundary where layoutMeta gets written. */
function toJsonMeta(meta: RoomLayoutMeta): Prisma.InputJsonValue {
  return meta as unknown as Prisma.InputJsonValue;
}

/** Keeps Room.layoutMeta.seatCount in sync with the real seat count, since
 * dashboard/room-card occupancy displays read it as "total seats." */
async function syncRoomSeatCount(tx: Prisma.TransactionClient, roomId: string) {
  const [room, actualCount] = await Promise.all([
    tx.room.findUniqueOrThrow({ where: { id: roomId } }),
    tx.seat.count({ where: { roomId } }),
  ]);
  const meta = readLayoutMeta(room.layoutMeta);
  if (meta.seatCount !== actualCount) {
    await tx.room.update({
      where: { id: roomId },
      data: { layoutMeta: toJsonMeta({ ...meta, seatCount: actualCount }) },
    });
  }
}

export async function createRoom(input: z.infer<typeof roomInputSchema>) {
  const data = roomInputSchema.parse(input);
  const user = await requireRole("admin");

  // Initial capacity exactly fits the requested seat count; admin grows it
  // later via "Add row"/"Add column" before placing more seats into it.
  const podRows = Math.max(1, Math.ceil(data.seatCount / (data.podCols * 4)));

  const created = await prisma.room.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      layoutMeta: toJsonMeta({
        podCols: data.podCols,
        podRows,
        seatCount: data.seatCount,
        floor: data.floor,
        features: [],
      }),
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "ROOM_CREATE", entity: "Room", entityId: created.id },
  });

  refresh();
  return { id: created.id };
}

/** How many occupants/devices deleting this room would affect — the client
 * calls this first to decide which confirmation to show before calling
 * `deleteRoom`. */
export async function getRoomDeleteImpact(
  id: string,
): Promise<{ occupiedCount: number; deviceCount: number }> {
  idSchema.parse(id);
  await requireRole("admin");

  const [occupiedCount, deviceCount] = await Promise.all([
    prisma.seat.count({ where: { roomId: id, occupantMemberId: { not: null } } }),
    prisma.device.count({ where: { seat: { roomId: id } } }),
  ]);
  return { occupiedCount, deviceCount };
}

/**
 * Without `force` (default): hard server-side guard, mirroring `deleteSeat` —
 * a room with any occupied seat or any device placed on one of its seats
 * can't be deleted until they're cleared/moved first.
 *
 * With `force: true`: bulk-clears the room instead of blocking — downgrades
 * any PRIMARY devices on its seats to SECONDARY (so none end up sitting in
 * inventory still flagged primary once detached), then deletes the room.
 * Deleting the room cascades to its seats (`Seat.roomId onDelete: Cascade`),
 * which in turn detaches their devices (`Device.seatId onDelete: SetNull`)
 * and drops any pending seat requests (`SeatRequest.seatId onDelete: Cascade`)
 * — all handled by the DB, not manually here.
 */
export async function deleteRoom(id: string, force: boolean = false) {
  idSchema.parse(id);
  const user = await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    const occupiedCount = await tx.seat.count({
      where: { roomId: id, occupantMemberId: { not: null } },
    });
    const deviceCount = await tx.device.count({ where: { seat: { roomId: id } } });

    if (!force) {
      if (occupiedCount > 0) {
        throw new Error("This room has occupied seats. Remove all occupants before deleting it.");
      }
      if (deviceCount > 0) {
        throw new Error("This room has devices placed in it. Move them before deleting it.");
      }
    } else if (occupiedCount > 0 || deviceCount > 0) {
      await tx.device.updateMany({
        where: { seat: { roomId: id }, role: "PRIMARY" },
        data: { role: "SECONDARY" },
      });
    }

    await tx.room.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: force && (occupiedCount > 0 || deviceCount > 0) ? "ROOM_DELETE_FORCE" : "ROOM_DELETE",
        entity: "Room",
        entityId: id,
        meta: force ? { occupiedCount, deviceCount } : undefined,
      },
    });
  });

  refresh();
}

/** Auto-generates seqNo/code/position server-side — the caller only names the
 * room. seqNo is (re)derived from the live seat count inside the transaction
 * to avoid a race between concurrent adds. */
export async function createSeat(roomId: string) {
  idSchema.parse(roomId);
  const user = await requireRole("admin");

  const created = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUniqueOrThrow({ where: { id: roomId } });
    const meta = readLayoutMeta(room.layoutMeta);

    const actualCount = await tx.seat.count({ where: { roomId } });
    if (actualCount >= meta.podCols * meta.podRows * 4) {
      throw new Error("No available space left in this room. Add a row or column first.");
    }

    const lastSeat = await tx.seat.findFirst({
      where: { roomId },
      orderBy: { seqNo: "desc" },
    });
    const seqNo = (lastSeat?.seqNo ?? 0) + 1;
    const code = `${room.code}-${String(seqNo).padStart(2, "0")}`;

    const geo = generateLayout({ podCols: meta.podCols, podRows: meta.podRows, seatCount: seqNo });
    const position = geo.positions.find((p) => p.seqNo === seqNo);

    const seat = await tx.seat.create({
      data: {
        roomId,
        code,
        seqNo,
        posX: position?.posX ?? 0,
        posY: position?.posY ?? 0,
      },
    });

    await syncRoomSeatCount(tx, roomId);
    await tx.auditLog.create({
      data: { actorId: user.accountId, action: "SEAT_CREATE", entity: "Seat", entityId: seat.id },
    });

    return seat;
  });

  refresh();
  return created;
}

/**
 * @deprecated Legacy grid/arrange editor only (archived at
 * `src/components/seatmap/_legacy`). The primary free-form editor uses
 * `saveRoomLayout` in `src/lib/actions/roomLayout.ts`. Kept functional.
 *
 * Grows the room's available space by one pod row — no seats are created;
 * this only widens the "walls" (podRows) that "Add seat" can later fill. */
export async function addRoomRow(roomId: string) {
  idSchema.parse(roomId);
  const user = await requireRole("admin");

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const meta = readLayoutMeta(room.layoutMeta);

  await prisma.room.update({
    where: { id: roomId },
    data: { layoutMeta: toJsonMeta({ ...meta, podRows: meta.podRows + 1 }) },
  });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "ROOM_ROW_ADD", entity: "Room", entityId: roomId },
  });

  refresh();
}

/**
 * @deprecated Legacy grid/arrange editor only (archived). Prefer the free-form
 * seam (`saveRoomLayout`). Kept functional.
 *
 * Grows the room's available space by one pod column — no seats are
 * created; this only widens the "walls" (podCols) that "Add seat" can later
 * fill. Existing seats keep their persisted positions untouched. */
export async function addRoomColumn(roomId: string) {
  idSchema.parse(roomId);
  const user = await requireRole("admin");

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const meta = readLayoutMeta(room.layoutMeta);

  await prisma.room.update({
    where: { id: roomId },
    data: { layoutMeta: toJsonMeta({ ...meta, podCols: meta.podCols + 1 }) },
  });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "ROOM_COLUMN_ADD", entity: "Room", entityId: roomId },
  });

  refresh();
}

/** Hard server-side guard: a seat with an occupant or any attached devices
 * can't be deleted until they're cleared/moved first. */
export async function deleteSeat(id: string) {
  idSchema.parse(id);
  const user = await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    const seat = await tx.seat.findUniqueOrThrow({ where: { id } });
    if (seat.occupantMemberId) {
      throw new Error("This seat is occupied. Remove the occupant before deleting it.");
    }
    const deviceCount = await tx.device.count({ where: { seatId: id } });
    if (deviceCount > 0) {
      throw new Error("This seat has devices on it. Move them before deleting it.");
    }

    await tx.seat.delete({ where: { id } });
    await syncRoomSeatCount(tx, seat.roomId);
    await tx.auditLog.create({
      data: { actorId: user.accountId, action: "SEAT_DELETE", entity: "Seat", entityId: id },
    });
  });

  refresh();
}

const saveSeatPositionsSchema = z
  .array(z.object({ id: idSchema, posX: z.number(), posY: z.number() }))
  .min(1);

/**
 * @deprecated Legacy grid/arrange editor only (archived). Writes the legacy
 * `posX/posY` fields; the primary free-form editor persists `x/y` via
 * `saveRoomLayout` in `src/lib/actions/roomLayout.ts`. Kept functional.
 *
 * Batch position save — called with a one-element array per drag-end, but
 * shaped to take any number of updates in one round trip. */
export async function saveSeatPositions(updates: z.infer<typeof saveSeatPositionsSchema>) {
  const data = saveSeatPositionsSchema.parse(updates);
  const user = await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    for (const u of data) {
      await tx.seat.update({ where: { id: u.id }, data: { posX: u.posX, posY: u.posY } });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "SEAT_MOVE",
        entity: "Seat",
        entityId: data[0].id,
        meta: { updates: data },
      },
    });
  });

  refresh();
}

const featureTypeSchema = z.enum(["door", "window"]);

/**
 * @deprecated Legacy grid/arrange editor only (archived). Writes
 * `Room.layoutMeta.features`; the primary editor stores free-form fixtures in
 * `Room.layoutFixtures` via `saveRoomLayout`. Kept functional.
 *
 * Adds a new door/window marker. Cascades the default offset a little per
 * existing feature so repeated adds don't stack exactly on top of each other. */
export async function addRoomFeature(roomId: string, type: RoomFeatureType) {
  idSchema.parse(roomId);
  featureTypeSchema.parse(type);
  const user = await requireRole("admin");

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const meta = readLayoutMeta(room.layoutMeta);
  // Spawn along the top wall, cascading sideways so repeated adds don't
  // stack — door/window markers are wall-mounted, never free-floating.
  const { width } = roomBounds(meta.podCols, meta.podRows);
  const feature: RoomFeature = {
    id: crypto.randomUUID(),
    type,
    posX: Math.min(20 + meta.features.length * 90, Math.max(0, width - FEATURE_TILE_WIDTH)),
    posY: 0,
  };

  await prisma.room.update({
    where: { id: roomId },
    data: { layoutMeta: toJsonMeta({ ...meta, features: [...meta.features, feature] }) },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.accountId,
      action: "ROOM_FEATURE_ADD",
      entity: "Room",
      entityId: roomId,
      meta: feature as unknown as Prisma.InputJsonValue,
    },
  });

  refresh();
}

/** @deprecated Legacy grid/arrange editor only (archived). Prefer `saveRoomLayout`. */
export async function moveRoomFeature(roomId: string, featureId: string, posX: number, posY: number) {
  idSchema.parse(roomId);
  idSchema.parse(featureId);
  const user = await requireRole("admin");

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const meta = readLayoutMeta(room.layoutMeta);
  if (!meta.features.some((f) => f.id === featureId)) {
    throw new Error("That door/window marker no longer exists.");
  }
  // Server-side authority for the "door/window can only be on the wall"
  // constraint — the client also snaps live during drag, but this is what
  // actually gets persisted regardless of what the client sends.
  const { width, height } = roomBounds(meta.podCols, meta.podRows);
  const snapped = snapToBorder(posX, posY, width, height, FEATURE_TILE_WIDTH, FEATURE_TILE_HEIGHT);
  const features = meta.features.map((f) => (f.id === featureId ? { ...f, ...snapped } : f));

  await prisma.room.update({ where: { id: roomId }, data: { layoutMeta: toJsonMeta({ ...meta, features }) } });
  await prisma.auditLog.create({
    data: {
      actorId: user.accountId,
      action: "ROOM_FEATURE_MOVE",
      entity: "Room",
      entityId: roomId,
      meta: { featureId, ...snapped },
    },
  });

  refresh();
}

/** @deprecated Legacy grid/arrange editor only (archived). Prefer `saveRoomLayout`. */
export async function deleteRoomFeature(roomId: string, featureId: string) {
  idSchema.parse(roomId);
  idSchema.parse(featureId);
  const user = await requireRole("admin");

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const meta = readLayoutMeta(room.layoutMeta);
  const features = meta.features.filter((f) => f.id !== featureId);

  await prisma.room.update({ where: { id: roomId }, data: { layoutMeta: toJsonMeta({ ...meta, features }) } });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "ROOM_FEATURE_DELETE", entity: "Room", entityId: roomId, meta: { featureId } },
  });

  refresh();
}
