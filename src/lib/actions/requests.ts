"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth/session";

const idSchema = z.string().min(1);

/** Any signed-in member can request a seat for themself (subject defaults to
 * the caller). No-ops if an identical pending request already exists. */
export async function createSeatRequest(seatId: string, subjectMemberId?: string) {
  idSchema.parse(seatId);
  const user = await requireUser();
  if (!user.memberId) throw new Error("Signed-in account has no linked member.");
  const subject = subjectMemberId ?? user.memberId;
  idSchema.parse(subject);

  const existing = await prisma.seatRequest.findFirst({
    where: { seatId, subjectMemberId: subject, status: "PENDING" },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const created = await tx.seatRequest.create({
      data: {
        seatId,
        subjectMemberId: subject,
        createdByMemberId: user.memberId!,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "REQUEST_CREATE",
        entity: "SeatRequest",
        entityId: created.id,
        meta: { seatId, subjectMemberId: subject },
      },
    });
  });

  refresh();
}

/** Manager/Admin only: approves a pending request, seating its subject and
 * auto-rejecting any other pending requests for the same seat. */
export async function approveRequest(id: string) {
  idSchema.parse(id);
  const user = await requireRole("manager");

  await prisma.$transaction(async (tx) => {
    const request = await tx.seatRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== "PENDING") return;

    if (request.subjectMemberId) {
      await tx.device.updateMany({
        where: { seatId: request.seatId, role: "PRIMARY" },
        data: { role: "SECONDARY" },
      });
    }

    await tx.seat.update({
      where: { id: request.seatId },
      data: { occupantMemberId: request.subjectMemberId, status: "OCCUPIED" },
    });

    await tx.seatRequest.update({
      where: { id },
      data: { status: "APPROVED", decidedByMemberId: user.memberId, decidedAt: new Date() },
    });

    await tx.seatRequest.updateMany({
      where: { seatId: request.seatId, status: "PENDING", NOT: { id } },
      data: { status: "REJECTED", decidedByMemberId: user.memberId, decidedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "REQUEST_APPROVE",
        entity: "SeatRequest",
        entityId: id,
        meta: { seatId: request.seatId, subjectMemberId: request.subjectMemberId },
      },
    });
  });

  refresh();
}

/** Manager/Admin only: rejects a pending request. */
export async function rejectRequest(id: string) {
  idSchema.parse(id);
  const user = await requireRole("manager");

  await prisma.$transaction(async (tx) => {
    const request = await tx.seatRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== "PENDING") return;

    await tx.seatRequest.update({
      where: { id },
      data: { status: "REJECTED", decidedByMemberId: user.memberId, decidedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.accountId,
        action: "REQUEST_REJECT",
        entity: "SeatRequest",
        entityId: id,
      },
    });
  });

  refresh();
}
