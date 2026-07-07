import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { placeDevice, moveDevice } from "./devices";
import { cleanupDb, makeDevice, makeMember, makeRoom, makeSeat } from "../../../test/fixtures";
import { setTestSession } from "../../../test/setup";

async function actor(role: "user" | "manager" | "admin", memberId?: string) {
  const member = memberId ? { id: memberId } : await makeMember();
  return { accountId: `acc-${member.id}`, memberId: member.id, role, isActive: true };
}

describe("device placement rules", () => {
  beforeEach(async () => {
    await cleanupDb();
  });

  it("rejects placing a PRIMARY device unless its owner is the seat's current occupant", async () => {
    const room = await makeRoom();
    const occupant = await makeMember({ name: "Occupant" });
    const otherOwner = await makeMember({ name: "Other" });
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    const device = await makeDevice(otherOwner.id);

    setTestSession(await actor("admin"));
    await expect(placeDevice(device.id, seat.id, "PRIMARY")).rejects.toThrow(
      /owned by the seat's current occupant/,
    );

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.seatId).toBeNull();
  });

  it("allows placing a PRIMARY device when its owner IS the seat's current occupant", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    const device = await makeDevice(occupant.id);

    setTestSession(await actor("admin"));
    await placeDevice(device.id, seat.id, "PRIMARY");

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.seatId).toBe(seat.id);
    expect(deviceAfter.role).toBe("PRIMARY");
  });

  it("enforces one primary per seat at the app level", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    await makeDevice(occupant.id, { seatId: seat.id, role: "PRIMARY" });
    const secondDevice = await makeDevice(occupant.id);

    setTestSession(await actor("admin"));
    await expect(placeDevice(secondDevice.id, seat.id, "PRIMARY")).rejects.toThrow(
      /already has a primary device/,
    );
  });

  it("enforces one primary per seat at the DB level (partial unique index), bypassing the app check", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    await makeDevice(occupant.id, { seatId: seat.id, role: "PRIMARY" });
    const secondDevice = await makeDevice(occupant.id, { seatId: seat.id });

    // Bypass the app-level guard entirely and hit Prisma directly.
    await expect(
      prisma.device.update({ where: { id: secondDevice.id }, data: { role: "PRIMARY" } }),
    ).rejects.toThrow();
  });

  it("moveDevice(null) returns a device to inventory", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    const device = await makeDevice(occupant.id, { seatId: seat.id, role: "SECONDARY" });

    setTestSession(await actor("user", occupant.id));
    await moveDevice(device.id, null);

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.seatId).toBeNull();
  });

  it("rejects a USER moving a device they don't own (Manager is same as User for device ownership)", async () => {
    const room = await makeRoom();
    const owner = await makeMember({ name: "Owner" });
    const someoneElse = await makeMember({ name: "Someone else" });
    const device = await makeDevice(owner.id);

    setTestSession(await actor("manager", someoneElse.id));
    await expect(moveDevice(device.id, null)).rejects.toThrow(/own devices/);
  });

  it("allows ADMIN to move any device regardless of ownership", async () => {
    const owner = await makeMember({ name: "Owner" });
    const device = await makeDevice(owner.id);

    setTestSession(await actor("admin"));
    await moveDevice(device.id, null);

    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.seatId).toBeNull();
  });
});
