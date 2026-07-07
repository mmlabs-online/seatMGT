"use server";

/**
 * Mutations for the Room Layout Editor v2 (free-form). Admin-only, matching the
 * original layout designer's permission. These only position seats/fixtures —
 * they never assign occupants or devices, so "status is derived" is preserved.
 *
 * v2 writes free-form coords to `Seat.x/y/rotation/w/h` and the room's
 * `layoutFixtures`. It deliberately leaves the original editor's `posX/posY`
 * and `col/row` untouched (the two editors are independent by default; the new
 * one is seeded from the old on first open — see src/lib/data/roomLayout.ts).
 *
 * Seat delete reuses the existing guarded `deleteSeat` action (no occupant /
 * no devices) rather than duplicating that business rule.
 */
import { z } from "zod";
import { refresh } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getRoomLayout } from "@/lib/data/roomLayout";
import { deleteSeat } from "@/lib/actions/rooms";
import { SEAT_H, SEAT_W, type RoomLayoutData, type SeatWithLayout } from "@/lib/roomLayout";

const idSchema = z.string().min(1);

/** Thin wrapper over the existing guarded seat delete (admin-only, blocks if the
 * seat has an occupant or attached devices) so the editor reuses that rule. */
export async function deleteLayoutSeat(id: string): Promise<void> {
  await deleteSeat(id);
}

const fixtureSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
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
  ]),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  rotation: z.number().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const seatPlacementSchema = z.object({
  id: idSchema,
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  w: z.number().positive().nullish(),
  h: z.number().positive().nullish(),
  cannotSeat: z.boolean().default(false),
});

const saveSchema = z.object({
  seats: z.array(seatPlacementSchema),
  fixtures: z.array(fixtureSchema),
});

/** Persists the whole editor state in one transaction: every seat's free-form
 * placement + the room's fixture array. Only seats that belong to this room are
 * written (defensive against a stale/foreign id in the payload). */
export async function saveRoomLayout(
  roomId: string,
  input: z.infer<typeof saveSchema>,
): Promise<RoomLayoutData> {
  idSchema.parse(roomId);
  const data = saveSchema.parse(input);
  const user = await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    await tx.room.findUniqueOrThrow({ where: { id: roomId } });

    const ownSeatIds = new Set(
      (await tx.seat.findMany({ where: { roomId }, select: { id: true } })).map((s) => s.id),
    );

    for (const s of data.seats) {
      if (!ownSeatIds.has(s.id)) continue;
      await tx.seat.update({
        where: { id: s.id },
        data: {
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          w: s.w ?? null,
          h: s.h ?? null,
          cannotSeat: s.cannotSeat,
        },
      });
    }

    await tx.room.update({
      where: { id: roomId },
      data: { layoutFixtures: data.fixtures as unknown as Prisma.InputJsonValue },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "ROOM_LAYOUT_SAVE_V2",
        entity: "Room",
        entityId: roomId,
        meta: { seats: data.seats.length, fixtures: data.fixtures.length },
      },
    });
  });

  refresh();
  const layout = await getRoomLayout(roomId);
  if (!layout) throw new Error("Room not found after save.");
  return layout;
}

/** Creates a real Seat with an auto-generated port code (`room.code + seqNo`,
 * mirroring the existing `createSeat`) at a canvas point. Writes BOTH the
 * free-form `x/y` and the original `posX/posY` so a seat added here also shows
 * up in the original editor. Returns the new seat in the editor's shape. */
export async function addLayoutSeat(
  roomId: string,
  x: number,
  y: number,
): Promise<SeatWithLayout> {
  idSchema.parse(roomId);
  z.number().parse(x);
  z.number().parse(y);
  const user = await requireRole("admin");

  const seat = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUniqueOrThrow({ where: { id: roomId } });

    // Same seqNo/code derivation as the original createSeat, re-read inside the
    // transaction to avoid a race between concurrent adds.
    const lastSeat = await tx.seat.findFirst({
      where: { roomId },
      orderBy: { seqNo: "desc" },
    });
    const seqNo = (lastSeat?.seqNo ?? 0) + 1;
    const code = `${room.code}-${String(seqNo).padStart(2, "0")}`;

    const created = await tx.seat.create({
      data: { roomId, code, seqNo, x, y, posX: x, posY: y },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "SEAT_CREATE",
        entity: "Seat",
        entityId: created.id,
        meta: { via: "layout-editor-v2", x, y },
      },
    });

    return created;
  });

  refresh();

  return {
    id: seat.id,
    code: seat.code,
    seqNo: seat.seqNo,
    x: seat.x ?? x,
    y: seat.y ?? y,
    rotation: seat.rotation,
    w: seat.w ?? SEAT_W,
    h: seat.h ?? SEAT_H,
    cannotSeat: seat.cannotSeat,
    status: "empty",
    deviceCount: 0,
  };
}
