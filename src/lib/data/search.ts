"use server";

/**
 * Server-side search/filter reads, called directly from client components
 * (debounced on typing) rather than filtering full arrays in the browser.
 * Kept separate from `src/lib/actions/` (mutations) and `src/lib/data/index.ts`
 * (the core read seam) since these are page-specific query helpers, not part
 * of the store's initial-data contract.
 */
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mapDevice, mapMember } from "@/lib/data";
import type { Device, Member } from "@/types";

const insensitive = { mode: "insensitive" as const };

const searchDevicesSchema = z.object({
  filter: z.enum(["all", "placed", "inventory"]).default("all"),
  query: z.string().default(""),
});

export async function searchDevices(
  input: Partial<z.infer<typeof searchDevicesSchema>>,
): Promise<Device[]> {
  const { filter, query } = searchDevicesSchema.parse(input);
  const q = query.trim();

  const where: Prisma.DeviceWhereInput = {};
  if (filter === "placed") where.seatId = { not: null };
  if (filter === "inventory") where.seatId = null;
  if (q) {
    where.OR = [
      { name: { contains: q, ...insensitive } },
      { inventoryNumber: { contains: q, ...insensitive } },
      { mac: { contains: q, ...insensitive } },
      { owner: { name: { contains: q, ...insensitive } } },
    ];
  }

  const devices = await prisma.device.findMany({ where, orderBy: { name: "asc" } });
  return devices.map(mapDevice);
}

export async function searchMembers(query: string = ""): Promise<Member[]> {
  const q = query.trim();
  const members = await prisma.member.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, ...insensitive } },
            { employeeCode: { contains: q, ...insensitive } },
          ],
        }
      : {},
    include: { account: true },
    orderBy: { name: "asc" },
  });
  return members.map(mapMember);
}

export interface SeatSearchResult {
  seatId: string;
  code: string;
  roomCode: string;
  roomName: string;
  occupantName?: string;
}

/** Cross-room seat lookup by seat code or occupant name, for the Rooms list
 * page search box. Empty query returns no results (not the whole campus). */
export async function searchSeats(query: string): Promise<SeatSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const seats = await prisma.seat.findMany({
    where: {
      OR: [
        { code: { contains: q, ...insensitive } },
        { occupant: { name: { contains: q, ...insensitive } } },
      ],
    },
    include: { room: true, occupant: true },
    orderBy: { code: "asc" },
    take: 20,
  });

  return seats.map((s) => ({
    seatId: s.id,
    code: s.code,
    roomCode: s.room.code,
    roomName: s.room.name,
    occupantName: s.occupant?.name,
  }));
}
