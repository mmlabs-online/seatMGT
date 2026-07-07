import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { FEATURE_TILE_HEIGHT, FEATURE_TILE_WIDTH, roomBounds } from "@/lib/layout";
import {
  addRoomColumn,
  addRoomFeature,
  addRoomRow,
  createRoom,
  createSeat,
  deleteRoom,
  deleteRoomFeature,
  deleteSeat,
  getRoomDeleteImpact,
  moveRoomFeature,
  saveSeatPositions,
} from "./rooms";
import { cleanupDb, makeDevice, makeMember, makeRoom, makeSeat } from "../../../test/fixtures";
import { setTestSession } from "../../../test/setup";

type RoomLayoutMeta = {
  podCols: number;
  podRows: number;
  seatCount: number;
  features: { id: string; type: string; posX: number; posY: number }[];
};

/** A marker is "on the wall" when its top-left touches one of the 4 edges of
 * the room's (0,0)-(width,height) bounding box. */
function isOnBorder(posX: number, posY: number, width: number, height: number) {
  return (
    posX === 0 ||
    posY === 0 ||
    posX + FEATURE_TILE_WIDTH === width ||
    posY + FEATURE_TILE_HEIGHT === height
  );
}

async function actor(role: "user" | "manager" | "admin") {
  const member = await makeMember();
  return { accountId: `acc-${member.id}`, memberId: member.id, role, isActive: true };
}

describe("layout designer (Admin only)", () => {
  beforeEach(async () => {
    await cleanupDb();
  });

  it("createSeat auto-generates seqNo/code and keeps Room.layoutMeta.seatCount in sync", async () => {
    // podRows: 2 leaves room for a 2nd seat beyond the pre-existing one within podCols:2's capacity (8).
    const room = await makeRoom({ code: "Z9", podCols: 2, podRows: 2, seatCount: 1 });
    await makeSeat(room.id, { seqNo: 1, code: "Z9-01" });

    setTestSession(await actor("admin"));
    const created = await createSeat(room.id);

    expect(created.seqNo).toBe(2);
    expect(created.code).toBe("Z9-02");

    const roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    expect((roomAfter.layoutMeta as { seatCount: number }).seatCount).toBe(2);
  });

  it("createSeat rejects once the room's available space (podCols * podRows * 4) is full", async () => {
    const room = await makeRoom({ code: "F1", podCols: 1, podRows: 1, seatCount: 4 });
    await makeSeat(room.id, { seqNo: 1, code: "F1-01" });
    await makeSeat(room.id, { seqNo: 2, code: "F1-02" });
    await makeSeat(room.id, { seqNo: 3, code: "F1-03" });
    await makeSeat(room.id, { seqNo: 4, code: "F1-04" });

    setTestSession(await actor("admin"));
    await expect(createSeat(room.id)).rejects.toThrow(/available space/i);
  });

  it("deleteSeat blocks an occupied seat", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });

    setTestSession(await actor("admin"));
    await expect(deleteSeat(seat.id)).rejects.toThrow(/occupied/);
  });

  it("deleteSeat blocks a seat with devices on it", async () => {
    const room = await makeRoom();
    const owner = await makeMember();
    const seat = await makeSeat(room.id);
    await makeDevice(owner.id, { seatId: seat.id });

    setTestSession(await actor("admin"));
    await expect(deleteSeat(seat.id)).rejects.toThrow(/devices/);
  });

  it("deleteSeat succeeds on an empty, deviceless seat and syncs seatCount", async () => {
    const room = await makeRoom({ seatCount: 2 });
    const seatA = await makeSeat(room.id, { seqNo: 1, code: "A-01" });
    await makeSeat(room.id, { seqNo: 2, code: "A-02" });

    setTestSession(await actor("admin"));
    await deleteSeat(seatA.id);

    const roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    expect((roomAfter.layoutMeta as { seatCount: number }).seatCount).toBe(1);
  });

  it("deleteRoom blocks a room with an occupied seat", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    await makeSeat(room.id, { occupantMemberId: occupant.id });

    setTestSession(await actor("admin"));
    await expect(deleteRoom(room.id)).rejects.toThrow(/occupied/);

    // nothing was deleted
    expect(await prisma.room.findUnique({ where: { id: room.id } })).not.toBeNull();
  });

  it("deleteRoom blocks a room with devices placed on its seats", async () => {
    const room = await makeRoom();
    const owner = await makeMember();
    const seat = await makeSeat(room.id);
    await makeDevice(owner.id, { seatId: seat.id });

    setTestSession(await actor("admin"));
    await expect(deleteRoom(room.id)).rejects.toThrow(/devices/);
    expect(await prisma.room.findUnique({ where: { id: room.id } })).not.toBeNull();
  });

  it("deleteRoom succeeds on a room with only empty, deviceless seats", async () => {
    const room = await makeRoom();
    await makeSeat(room.id);

    setTestSession(await actor("admin"));
    await deleteRoom(room.id);

    expect(await prisma.room.findUnique({ where: { id: room.id } })).toBeNull();
  });

  it("getRoomDeleteImpact reports occupied seat and device counts", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    await makeDevice(occupant.id, { seatId: seat.id });
    await makeSeat(room.id, { seqNo: 2 }); // empty, unaffected

    setTestSession(await actor("admin"));
    const impact = await getRoomDeleteImpact(room.id);
    expect(impact).toEqual({ occupiedCount: 1, deviceCount: 1 });
  });

  it("deleteRoom(id, true) bulk-clears occupants/devices instead of blocking, and downgrades a PRIMARY device", async () => {
    const room = await makeRoom();
    const occupant = await makeMember();
    const seat = await makeSeat(room.id, { occupantMemberId: occupant.id });
    const device = await makeDevice(occupant.id, { seatId: seat.id, role: "PRIMARY" });

    setTestSession(await actor("admin"));
    await deleteRoom(room.id, true);

    expect(await prisma.room.findUnique({ where: { id: room.id } })).toBeNull();
    expect(await prisma.seat.findUnique({ where: { id: seat.id } })).toBeNull();

    // the member and device rows survive — just detached, not deleted
    expect(await prisma.member.findUnique({ where: { id: occupant.id } })).not.toBeNull();
    const deviceAfter = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(deviceAfter.seatId).toBeNull();
    expect(deviceAfter.role).toBe("SECONDARY"); // downgraded before detaching
  });

  it("saveSeatPositions persists dragged coordinates", async () => {
    const room = await makeRoom();
    const seat = await makeSeat(room.id, { posX: 0, posY: 0 });

    setTestSession(await actor("admin"));
    await saveSeatPositions([{ id: seat.id, posX: 123, posY: 456 }]);

    const seatAfter = await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } });
    expect(seatAfter.posX).toBe(123);
    expect(seatAfter.posY).toBe(456);
  });

  it.each([
    ["user", createRoom, { code: "X1", name: "X", podCols: 1, seatCount: 4, floor: "F1" }] as const,
    ["manager", createRoom, { code: "X2", name: "X", podCols: 1, seatCount: 4, floor: "F1" }] as const,
  ])("rejects a %s calling createRoom (Admin only)", async (role, fn, input) => {
    setTestSession(await actor(role));
    await expect(fn(input)).rejects.toThrow();
  });

  it("rejects a MANAGER calling deleteRoom (Admin only)", async () => {
    const room = await makeRoom();
    setTestSession(await actor("manager"));
    await expect(deleteRoom(room.id)).rejects.toThrow();
  });

  it("rejects a MANAGER calling createSeat (Admin only)", async () => {
    const room = await makeRoom();
    setTestSession(await actor("manager"));
    await expect(createSeat(room.id)).rejects.toThrow();
  });

  it("rejects a MANAGER calling saveSeatPositions (Admin only)", async () => {
    const room = await makeRoom();
    const seat = await makeSeat(room.id);
    setTestSession(await actor("manager"));
    await expect(saveSeatPositions([{ id: seat.id, posX: 1, posY: 1 }])).rejects.toThrow();
  });

  it("addRoomRow grows available space (podRows) without creating any seats", async () => {
    const room = await makeRoom({ code: "R1", podCols: 2, podRows: 1, seatCount: 1 });
    await makeSeat(room.id, { seqNo: 1, code: "R1-01" });

    setTestSession(await actor("admin"));
    await addRoomRow(room.id);

    const seats = await prisma.seat.findMany({ where: { roomId: room.id } });
    expect(seats).toHaveLength(1); // unchanged — no seats created

    const roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    const meta = roomAfter.layoutMeta as RoomLayoutMeta;
    expect(meta.podRows).toBe(2);
    expect(meta.podCols).toBe(2);
    expect(meta.seatCount).toBe(1); // unchanged
  });

  it("addRoomColumn grows available space (podCols) without creating any seats", async () => {
    const room = await makeRoom({ code: "C1", podCols: 1, podRows: 2, seatCount: 2 });
    await makeSeat(room.id, { seqNo: 1, code: "C1-01" });
    await makeSeat(room.id, { seqNo: 2, code: "C1-02" });

    setTestSession(await actor("admin"));
    await addRoomColumn(room.id);

    const seats = await prisma.seat.findMany({ where: { roomId: room.id } });
    expect(seats).toHaveLength(2); // unchanged — no seats created

    const roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    const meta = roomAfter.layoutMeta as RoomLayoutMeta;
    expect(meta.podCols).toBe(2);
    expect(meta.podRows).toBe(2);
    expect(meta.seatCount).toBe(2); // unchanged
  });

  it("addRoomRow then createSeat fills the newly available space", async () => {
    const room = await makeRoom({ code: "R2", podCols: 1, podRows: 1, seatCount: 4 });
    await makeSeat(room.id, { seqNo: 1, code: "R2-01" });
    await makeSeat(room.id, { seqNo: 2, code: "R2-02" });
    await makeSeat(room.id, { seqNo: 3, code: "R2-03" });
    await makeSeat(room.id, { seqNo: 4, code: "R2-04" });

    setTestSession(await actor("admin"));
    await expect(createSeat(room.id)).rejects.toThrow(/available space/i); // full before growing

    await addRoomRow(room.id);
    const created = await createSeat(room.id); // succeeds now that podRows grew
    expect(created.seqNo).toBe(5);
  });

  it.each([
    ["user", addRoomRow] as const,
    ["manager", addRoomRow] as const,
  ])("rejects a %s calling addRoomRow (Admin only)", async (role, fn) => {
    const room = await makeRoom();
    setTestSession(await actor(role));
    await expect(fn(room.id)).rejects.toThrow();
  });

  it("rejects a MANAGER calling addRoomColumn (Admin only)", async () => {
    const room = await makeRoom();
    setTestSession(await actor("manager"));
    await expect(addRoomColumn(room.id)).rejects.toThrow();
  });

  it("addRoomFeature / moveRoomFeature / deleteRoomFeature round-trip through Room.layoutMeta.features, always on the wall", async () => {
    const room = await makeRoom({ podCols: 2, podRows: 1, seatCount: 4 });
    const { width, height } = roomBounds(2, 1);
    setTestSession(await actor("admin"));

    await addRoomFeature(room.id, "door");
    let roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    let meta = roomAfter.layoutMeta as RoomLayoutMeta;
    expect(meta.features).toHaveLength(1);
    expect(meta.features[0].type).toBe("door");
    expect(isOnBorder(meta.features[0].posX, meta.features[0].posY, width, height)).toBe(true);
    const featureId = meta.features[0].id;

    // A move request deep inside the room (not near any wall) still lands on
    // the nearest wall — the constraint is enforced server-side, not just by
    // the client's own snapping.
    await moveRoomFeature(room.id, featureId, width / 2, height / 2);
    roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    meta = roomAfter.layoutMeta as RoomLayoutMeta;
    expect(isOnBorder(meta.features[0].posX, meta.features[0].posY, width, height)).toBe(true);

    await deleteRoomFeature(room.id, featureId);
    roomAfter = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    meta = roomAfter.layoutMeta as RoomLayoutMeta;
    expect(meta.features).toHaveLength(0);
  });

  it("rejects a MANAGER calling addRoomFeature (Admin only)", async () => {
    const room = await makeRoom();
    setTestSession(await actor("manager"));
    await expect(addRoomFeature(room.id, "window")).rejects.toThrow();
  });
});
