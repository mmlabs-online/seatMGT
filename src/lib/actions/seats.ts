"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

const idSchema = z.string().min(1);

/** Manager/Admin only: seats an occupant, downgrading a pre-existing primary
 * device on the seat if it belonged to someone else (a primary must be owned
 * by the CURRENT occupant). */
export async function assignOccupant(seatId: string, memberId: string) {
  idSchema.parse(seatId);
  idSchema.parse(memberId);
  const user = await requireRole("manager");

  await prisma.$transaction(async (tx) => {
    await tx.member.findUniqueOrThrow({ where: { id: memberId } });
    const seat = await tx.seat.findUniqueOrThrow({ where: { id: seatId } });

    if (seat.occupantMemberId !== memberId) {
      await tx.device.updateMany({
        where: { seatId, role: "PRIMARY" },
        data: { role: "SECONDARY" },
      });
    }

    await tx.seat.update({
      where: { id: seatId },
      data: { occupantMemberId: memberId, status: "OCCUPIED" },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "SEAT_ASSIGN",
        entity: "Seat",
        entityId: seatId,
        meta: { memberId },
      },
    });
  });

  refresh();
}

/** Manager/Admin only: clears a seat's occupant. A seat with no occupant has
 * no primary device, so any primary on it auto-downgrades to secondary. */
export async function unassignOccupant(seatId: string) {
  idSchema.parse(seatId);
  const user = await requireRole("manager");

  await prisma.$transaction(async (tx) => {
    await tx.device.updateMany({
      where: { seatId, role: "PRIMARY" },
      data: { role: "SECONDARY" },
    });

    await tx.seat.update({
      where: { id: seatId },
      data: { occupantMemberId: null, status: "EMPTY", projectId: null },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "SEAT_UNASSIGN",
        entity: "Seat",
        entityId: seatId,
      },
    });
  });

  refresh();
}
