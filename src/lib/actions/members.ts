"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

const idSchema = z.string().min(1);

/**
 * Manager/Admin only, per the permission matrix ("Create/edit accounts +
 * members"). Capability-only for this pass — no dedicated CRUD screen was
 * flagged as missing, so these aren't wired to new UI yet.
 */
const memberInputSchema = z.object({
  name: z.string().min(1),
  employeeCode: z.string().min(1).nullish(),
  groupId: z.string().nullish(),
});

export async function createMember(input: z.infer<typeof memberInputSchema>) {
  const data = memberInputSchema.parse(input);
  const user = await requireRole("manager");

  const created = await prisma.member.create({ data });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "MEMBER_CREATE", entity: "Member", entityId: created.id },
  });

  refresh();
}

export async function updateMember(
  id: string,
  input: Partial<z.infer<typeof memberInputSchema>>,
) {
  idSchema.parse(id);
  const data = memberInputSchema.partial().parse(input);
  const user = await requireRole("manager");

  await prisma.member.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { actorId: user.accountId, action: "MEMBER_UPDATE", entity: "Member", entityId: id },
  });

  refresh();
}

const createAccountSchema = z.object({
  memberId: idSchema,
  email: z.string().email(),
  role: z.enum(["USER", "MANAGER", "ADMIN"]),
});

/** Links a login to an existing member. Password/credential creation goes
 * through Better Auth's own sign-up flow; this just sets the app-facing role
 * and link once that account exists. */
export async function setAccountRole(input: z.infer<typeof createAccountSchema>) {
  const data = createAccountSchema.parse(input);
  const user = await requireRole("manager");

  await prisma.account.updateMany({
    where: { memberId: data.memberId },
    data: { role: data.role },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.accountId,
      action: "ACCOUNT_ROLE_SET",
      entity: "Member",
      entityId: data.memberId,
      meta: { role: data.role },
    },
  });

  refresh();
}
