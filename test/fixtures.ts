import { prisma } from "@/lib/db";

let counter = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/** FK-safe wipe of everything these tests touch. Better Auth's own tables
 * (Account/Session/AuthCredential) aren't used here — the session is mocked. */
export async function cleanupDb() {
  await prisma.auditLog.deleteMany();
  await prisma.seatRequest.deleteMany();
  await prisma.device.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.room.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();
  await prisma.project.deleteMany();
}

export function makeRoom(
  overrides: Partial<{ code: string; podCols: number; podRows: number; seatCount: number; floor: string }> = {},
) {
  const podCols = overrides.podCols ?? 2;
  const seatCount = overrides.seatCount ?? 4;
  return prisma.room.create({
    data: {
      code: overrides.code ?? uniq("R"),
      name: "Test Room",
      layoutMeta: {
        podCols,
        podRows: overrides.podRows ?? Math.max(1, Math.ceil(seatCount / (podCols * 4))),
        seatCount,
        floor: overrides.floor ?? "Floor 1",
      },
    },
  });
}

export function makeSeat(
  roomId: string,
  overrides: Partial<{ seqNo: number; code: string; occupantMemberId: string | null; posX: number; posY: number }> = {},
) {
  return prisma.seat.create({
    data: {
      roomId,
      seqNo: overrides.seqNo ?? 1,
      code: overrides.code ?? uniq("S"),
      occupantMemberId: overrides.occupantMemberId ?? null,
      status: overrides.occupantMemberId ? "OCCUPIED" : "EMPTY",
      posX: overrides.posX ?? 0,
      posY: overrides.posY ?? 0,
    },
  });
}

export function makeMember(overrides: Partial<{ name: string; employeeCode: string }> = {}) {
  return prisma.member.create({
    data: {
      name: overrides.name ?? "Test Member",
      employeeCode: overrides.employeeCode ?? uniq("EMP"),
    },
  });
}

export function makeDevice(
  ownerMemberId: string,
  overrides: Partial<{
    seatId: string | null;
    role: "PRIMARY" | "SECONDARY";
    inventoryNumber: string;
    mac: string;
    name: string;
    type: string;
  }> = {},
) {
  return prisma.device.create({
    data: {
      name: overrides.name ?? "Test Laptop",
      type: overrides.type ?? "Laptop",
      inventoryNumber: overrides.inventoryNumber ?? uniq("INV"),
      mac: overrides.mac ?? uniq("MAC"),
      ownerMemberId,
      seatId: overrides.seatId ?? null,
      role: overrides.role ?? "SECONDARY",
    },
  });
}

export function makeSeatRequest(
  seatId: string,
  subjectMemberId: string,
  createdByMemberId: string = subjectMemberId,
) {
  return prisma.seatRequest.create({
    data: { seatId, subjectMemberId, createdByMemberId },
  });
}
