import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { assignOccupant, unassignOccupant } from "./seats";
import { cleanupDb, makeDevice, makeMember, makeRoom, makeSeat } from "../../../test/fixtures";
import { setTestSession } from "../../../test/setup";

async function actor(role: "user" | "manager" | "admin") {
  const member = await makeMember();
  return { accountId: `acc-${member.id}`, memberId: member.id, role, isActive: true };
}

describe("seats actions", () => {
  beforeEach(async () => {
    await cleanupDb();
  });

  it("unassignOccupant clears occupant + status and downgrades the primary device, in one transaction", async () => {
    const room = await makeRoom();
    const occupant = await makeMember({ name: "Ada" });
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    const device = await makeDevice(occupant.id, { seatId: seat.id, role: "PRIMARY" });

    setTestSession(await actor("manager"));
    await unassignOccupant(seat.id);

    const seatAfter = await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } });
    expect(seatAfter.status).toBe("EMPTY");
    expect(seatAfter.occupantMemberId).toBeNull();

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.role).toBe("SECONDARY");
  });

  it("assignOccupant sets occupant + status derived from it", async () => {
    const room = await makeRoom();
    const member = await makeMember();
    const seat = await makeSeat(room.id);

    setTestSession(await actor("manager"));
    await assignOccupant(seat.id, member.id);

    const seatAfter = await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } });
    expect(seatAfter.occupantMemberId).toBe(member.id);
    expect(seatAfter.status).toBe("OCCUPIED");
  });

  it("assignOccupant downgrades a stale primary owned by the PREVIOUS occupant on reassignment", async () => {
    const room = await makeRoom();
    const oldOccupant = await makeMember({ name: "Old" });
    const newOccupant = await makeMember({ name: "New" });
    const seat = await makeSeat(room.id, { occupantMemberId: oldOccupant.id });
    const device = await makeDevice(oldOccupant.id, { seatId: seat.id, role: "PRIMARY" });

    setTestSession(await actor("admin"));
    await assignOccupant(seat.id, newOccupant.id);

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.role).toBe("SECONDARY");
  });

  it("rejects a USER calling assignOccupant (Manager/Admin only)", async () => {
    const room = await makeRoom();
    const member = await makeMember();
    const seat = await makeSeat(room.id);

    setTestSession(await actor("user"));
    await expect(assignOccupant(seat.id, member.id)).rejects.toThrow();
  });

  it("rejects a USER calling unassignOccupant (Manager/Admin only)", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });

    setTestSession(await actor("user"));
    await expect(unassignOccupant(seat.id)).rejects.toThrow();
  });
});
