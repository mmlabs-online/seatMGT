import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { approveRequest, createSeatRequest, rejectRequest } from "./requests";
import { cleanupDb, makeMember, makeRoom, makeSeat, makeSeatRequest } from "../../../test/fixtures";
import { setTestSession } from "../../../test/setup";

async function actor(role: "user" | "manager" | "admin", memberId?: string) {
  const member = memberId ? { id: memberId } : await makeMember();
  return { accountId: `acc-${member.id}`, memberId: member.id, role, isActive: true };
}

describe("seat request / approval flow", () => {
  beforeEach(async () => {
    await cleanupDb();
  });

  it("approving a request seats the subject transactionally and records decidedBy/decidedAt", async () => {
    const room = await makeRoom();
    const subject = await makeMember({ name: "Subject" });
    const seat = await makeSeat(room.id);
    const request = await makeSeatRequest(seat.id, subject.id);

    const manager = await actor("manager");
    setTestSession(manager);
    await approveRequest(request.id);

    const seatAfter = await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } });
    expect(seatAfter.occupantMemberId).toBe(subject.id);
    expect(seatAfter.status).toBe("OCCUPIED");

    const requestAfter = await prisma.seatRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(requestAfter.status).toBe("APPROVED");
    expect(requestAfter.decidedByMemberId).toBe(manager.memberId);
    expect(requestAfter.decidedAt).not.toBeNull();
  });

  it("rejecting a request never seats anyone", async () => {
    const room = await makeRoom();
    const subject = await makeMember({ name: "Subject" });
    const seat = await makeSeat(room.id);
    const request = await makeSeatRequest(seat.id, subject.id);

    setTestSession(await actor("manager"));
    await rejectRequest(request.id);

    const seatAfter = await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } });
    expect(seatAfter.status).toBe("EMPTY");
    expect(seatAfter.occupantMemberId).toBeNull();

    const requestAfter = await prisma.seatRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(requestAfter.status).toBe("REJECTED");
  });

  it("a USER can create a request for themself", async () => {
    const room = await makeRoom();
    const seat = await makeSeat(room.id);
    const user = await actor("user");
    setTestSession(user);

    await createSeatRequest(seat.id);

    const requests = await prisma.seatRequest.findMany({ where: { seatId: seat.id } });
    expect(requests).toHaveLength(1);
    expect(requests[0].subjectMemberId).toBe(user.memberId);
    expect(requests[0].status).toBe("PENDING");
  });

  it("rejects a USER approving a request (Manager/Admin only)", async () => {
    const room = await makeRoom();
    const subject = await makeMember();
    const seat = await makeSeat(room.id);
    const request = await makeSeatRequest(seat.id, subject.id);

    setTestSession(await actor("user"));
    await expect(approveRequest(request.id)).rejects.toThrow();
  });

  it("rejects a USER rejecting a request (Manager/Admin only)", async () => {
    const room = await makeRoom();
    const subject = await makeMember();
    const seat = await makeSeat(room.id);
    const request = await makeSeatRequest(seat.id, subject.id);

    setTestSession(await actor("user"));
    await expect(rejectRequest(request.id)).rejects.toThrow();
  });
});
