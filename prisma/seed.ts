/**
 * Seeds Postgres from the existing mock dataset (src/lib/mock/data.ts) so the
 * app renders identically once backed by Prisma. Only 3 representative
 * members get real logins (one per role) — everyone else remains a valid
 * Member row (occupant / device owner) with no account.
 */
import { prisma } from "../src/lib/db";
import { auth } from "../src/lib/auth/server";
import * as mock from "../src/lib/mock/data";

const DEMO_PASSWORD = "Password123!";

// mock member id -> which demo login it gets, if any
const DEMO_LOGINS: Record<string, { email: string; role: "ADMIN" | "MANAGER" | "USER" }> = {
  you: { email: "admin@example.com", role: "ADMIN" }, // Sam Rivera
  m2: { email: "manager@example.com", role: "MANAGER" }, // Grace Hopper
  m3: { email: "user@example.com", role: "USER" }, // Alan Turing
};

async function main() {
  // Safe to run on every deploy/container start: only seeds a fresh database.
  // For an explicit full local reset, use `npm run db:reset` instead (Prisma's
  // own migrate-reset, which drops, recreates, migrates, then reseeds).
  const alreadySeeded = await prisma.account.count();
  if (alreadySeeded > 0) {
    console.log("Database already has accounts — skipping seed.");
    return;
  }

  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.seatRequest.deleteMany();
  await prisma.device.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authCredential.deleteMany();
  await prisma.account.deleteMany();
  await prisma.member.deleteMany();
  await prisma.room.deleteMany();
  await prisma.group.deleteMany();
  await prisma.project.deleteMany();

  console.log("Seeding groups...");
  const groupIdByMockId = new Map<string, string>();
  for (const g of mock.groups) {
    const created = await prisma.group.create({
      data: { name: g.name, color: g.color },
    });
    groupIdByMockId.set(g.id, created.id);
  }

  console.log("Seeding projects...");
  const projectIdByMockId = new Map<string, string>();
  for (const p of mock.projects) {
    const created = await prisma.project.create({
      data: { code: p.code, name: p.name },
    });
    projectIdByMockId.set(p.id, created.id);
  }

  console.log("Seeding rooms...");
  const roomIdByMockId = new Map<string, string>();
  for (const r of mock.rooms) {
    const created = await prisma.room.create({
      data: {
        code: r.code,
        name: r.name,
        description: r.description,
        layoutMeta: {
          podCols: r.layout.podCols,
          seatCount: r.layout.seatCount,
          floor: r.floor,
        },
      },
    });
    roomIdByMockId.set(r.id, created.id);
  }

  console.log("Seeding members...");
  const memberIdByMockId = new Map<string, string>();
  for (const m of mock.members) {
    const created = await prisma.member.create({
      data: {
        name: m.name,
        employeeCode: m.employeeCode,
        groupId: m.groupId ? groupIdByMockId.get(m.groupId) : null,
      },
    });
    memberIdByMockId.set(m.id, created.id);
  }

  console.log("Seeding seats...");
  const seatIdByMockId = new Map<string, string>();
  for (const s of mock.seats) {
    const created = await prisma.seat.create({
      data: {
        code: s.code,
        seqNo: s.seqNo,
        roomId: roomIdByMockId.get(s.roomId)!,
        status: s.occupantMemberId ? "OCCUPIED" : "EMPTY",
        occupantMemberId: s.occupantMemberId
          ? memberIdByMockId.get(s.occupantMemberId)
          : null,
        groupId: s.groupId ? groupIdByMockId.get(s.groupId) : null,
        projectId: s.projectId ? projectIdByMockId.get(s.projectId) : null,
        posX: s.posX,
        posY: s.posY,
      },
    });
    seatIdByMockId.set(s.id, created.id);
  }

  console.log("Seeding devices...");
  for (const d of mock.devices) {
    await prisma.device.create({
      data: {
        name: d.name,
        type: d.type,
        inventoryNumber: d.inventoryNumber,
        mac: d.mac,
        role: d.role === "primary" ? "PRIMARY" : "SECONDARY",
        ownerMemberId: memberIdByMockId.get(d.ownerMemberId)!,
        seatId: d.seatId ? seatIdByMockId.get(d.seatId) : null,
      },
    });
  }

  // --- Room Layout Editor demo content --------------------------------------
  // Additive: seed C302 with Door/Window markers in the ORIGINAL editor's own
  // store (`layoutMeta.features`, pixel posX/posY). Because the new free-form
  // editor seeds its fixtures from these when it hasn't saved yet, the SAME
  // doors/windows appear in BOTH editors — demonstrating the carry-over. Seats
  // keep their generated posX/posY, which the new editor also reads. Everything
  // else is untouched.
  console.log("Seeding room-layout demo (C302 doors/windows)...");
  {
    const c302Id = roomIdByMockId.get("r-c302");
    if (c302Id) {
      // Demo a couple of ports that must not receive an occupant.
      for (const s of mock.seats.filter(
        (seat) => seat.roomId === "r-c302" && (seat.seqNo === 11 || seat.seqNo === 12),
      )) {
        const dbId = seatIdByMockId.get(s.id);
        if (dbId) await prisma.seat.update({ where: { id: dbId }, data: { cannotSeat: true } });
      }

      // Door/Window markers on the walls (pixels; C302 bounds ≈ 698×468).
      const features = [
        { id: "feat-door-top", type: "door", posX: 300, posY: 0 },
        { id: "feat-door-bottom", type: "door", posX: 500, posY: 428 },
        { id: "feat-win-left", type: "window", posX: 0, posY: 200 },
        { id: "feat-win-right", type: "window", posX: 630, posY: 150 },
      ];
      await prisma.room.update({
        where: { id: c302Id },
        data: {
          layoutMeta: { podCols: 3, podRows: 2, seatCount: 24, floor: "Floor 3", features },
        },
      });
    }
  }

  console.log("Seeding demo logins...");
  for (const [mockMemberId, login] of Object.entries(DEMO_LOGINS)) {
    const memberId = memberIdByMockId.get(mockMemberId)!;
    const member = mock.members.find((m) => m.id === mockMemberId)!;
    await auth.api.signUpEmail({
      body: { email: login.email, password: DEMO_PASSWORD, name: member.name },
    });
    await prisma.account.update({
      where: { email: login.email },
      data: { role: login.role, isActive: true, emailVerified: true, memberId },
    });
  }

  console.log("\nSeed complete.\n");
  console.log("Demo logins (all use password: " + DEMO_PASSWORD + "):");
  for (const [mockMemberId, login] of Object.entries(DEMO_LOGINS)) {
    const member = mock.members.find((m) => m.id === mockMemberId)!;
    console.log(`  ${login.email.padEnd(20)} -> ${member.name} (${login.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
