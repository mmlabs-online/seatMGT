"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/auth/session";

const idSchema = z.string().min(1);

/** ADMIN manages any device. USER/MANAGER manage only devices they own. */
function assertOwnsOrAdmin(user: SessionUser, ownerMemberId: string) {
  if (user.role === "admin") return;
  if (user.memberId && user.memberId === ownerMemberId) return;
  throw new Error("You can only manage your own devices.");
}

const createDeviceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  inventoryNumber: z.string().min(1),
  mac: z.string().nullish(),
  ownerMemberId: z.string().min(1),
  seatId: z.string().nullish(),
  role: z.enum(["PRIMARY", "SECONDARY"]).default("SECONDARY"),
});

export async function createDevice(input: z.infer<typeof createDeviceSchema>) {
  const data = createDeviceSchema.parse(input);
  const user = await requireUser();
  assertOwnsOrAdmin(user, data.ownerMemberId);

  await prisma.$transaction(async (tx) => {
    if (data.seatId) await assertPlacementAllowed(tx, data.seatId, data.ownerMemberId, data.role);
    const created = await tx.device.create({ data });
    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "DEVICE_CREATE",
        entity: "Device",
        entityId: created.id,
      },
    });
  });

  refresh();
}

const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  inventoryNumber: z.string().min(1).optional(),
  mac: z.string().nullish(),
});

export async function updateDevice(id: string, input: z.infer<typeof updateDeviceSchema>) {
  idSchema.parse(id);
  const data = updateDeviceSchema.parse(input);
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUniqueOrThrow({ where: { id } });
    assertOwnsOrAdmin(user, device.ownerMemberId);
    await tx.device.update({ where: { id }, data });
    await tx.auditLog.create({
      data: { actorId: user.accountId, action: "DEVICE_UPDATE", entity: "Device", entityId: id },
    });
  });

  refresh();
}

export async function deleteDevice(id: string) {
  idSchema.parse(id);
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUniqueOrThrow({ where: { id } });
    assertOwnsOrAdmin(user, device.ownerMemberId);
    await tx.device.delete({ where: { id } });
    await tx.auditLog.create({
      data: { actorId: user.accountId, action: "DEVICE_DELETE", entity: "Device", entityId: id },
    });
  });

  refresh();
}

/** One primary per seat + primary owner === current occupant (app-level check
 * ahead of the DB's partial unique index). */
async function assertPlacementAllowed(
  tx: Prisma.TransactionClient,
  seatId: string,
  ownerMemberId: string,
  role: "PRIMARY" | "SECONDARY",
) {
  const seat = await tx.seat.findUniqueOrThrow({ where: { id: seatId } });
  if (role === "PRIMARY") {
    if (!seat.occupantMemberId || seat.occupantMemberId !== ownerMemberId) {
      throw new Error("A primary device must be owned by the seat's current occupant.");
    }
    const existingPrimary = await tx.device.findFirst({
      where: { seatId, role: "PRIMARY" },
    });
    if (existingPrimary) {
      throw new Error("This seat already has a primary device.");
    }
  }
}

const placeDeviceSchema = z.object({
  deviceId: idSchema,
  seatId: idSchema,
  role: z.enum(["PRIMARY", "SECONDARY"]).default("SECONDARY"),
});

/** Places an inventory (or already-placed) device onto a seat. */
export async function placeDevice(
  deviceId: string,
  seatId: string,
  role: "PRIMARY" | "SECONDARY" = "SECONDARY",
) {
  const input = placeDeviceSchema.parse({ deviceId, seatId, role });
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUniqueOrThrow({ where: { id: input.deviceId } });
    assertOwnsOrAdmin(user, device.ownerMemberId);
    await assertPlacementAllowed(tx, input.seatId, device.ownerMemberId, input.role);

    await tx.device.update({
      where: { id: input.deviceId },
      data: { seatId: input.seatId, role: input.role },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "DEVICE_PLACE",
        entity: "Device",
        entityId: input.deviceId,
        meta: { seatId: input.seatId, role: input.role },
      },
    });
  });

  refresh();
}

/**
 * Relocates a device. `toSeatId: null` returns it to inventory. `intent`
 * chooses the role it should take at the destination seat when placing (it's
 * a no-op when returning to inventory).
 */
export async function moveDevice(
  deviceId: string,
  toSeatId: string | null,
  intent: "primary" | "secondary" = "secondary",
) {
  idSchema.parse(deviceId);
  if (toSeatId !== null) idSchema.parse(toSeatId);
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUniqueOrThrow({ where: { id: deviceId } });
    assertOwnsOrAdmin(user, device.ownerMemberId);

    if (toSeatId === null) {
      await tx.device.update({ where: { id: deviceId }, data: { seatId: null } });
    } else {
      const role = intent === "primary" ? "PRIMARY" : "SECONDARY";
      await assertPlacementAllowed(tx, toSeatId, device.ownerMemberId, role);
      await tx.device.update({ where: { id: deviceId }, data: { seatId: toSeatId, role } });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "DEVICE_MOVE",
        entity: "Device",
        entityId: deviceId,
        meta: { toSeatId, intent },
      },
    });
  });

  refresh();
}
