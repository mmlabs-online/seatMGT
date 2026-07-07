/**
 * Async data-access layer — the ONLY module UI/store code imports for data.
 *
 * Every function is async and returns the exact same shapes the mock seam
 * used to return. Backed by Prisma/Postgres now; `src/lib/mock/` is no longer
 * imported here (kept only for `prisma/seed.ts`).
 */
import "server-only";
import type {
  Account as PrismaAccount,
  Device as PrismaDevice,
  Group as PrismaGroup,
  Member as PrismaMember,
  Project as PrismaProject,
  Room as PrismaRoom,
  Seat as PrismaSeat,
  SeatRequest as PrismaSeatRequest,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import type {
  CurrentUser,
  Device,
  DeviceRole,
  DeviceType,
  Group,
  Member,
  Project,
  RequestStatus,
  Role,
  Room,
  RoomFeature,
  RoomLayout,
  Seat,
  SeatRequest,
  SeatStatus,
} from "@/types";

export type MemberWithAccount = PrismaMember & { account: PrismaAccount | null };

export function mapRoom(room: PrismaRoom): Room {
  const meta =
    (room.layoutMeta as {
      podCols?: number;
      podRows?: number;
      seatCount?: number;
      floor?: string;
      features?: RoomFeature[];
    } | null) ?? {};
  const podCols = meta.podCols ?? 1;
  const seatCount = meta.seatCount ?? 0;
  const layout: RoomLayout = {
    podCols,
    // Legacy rooms saved before podRows existed don't have it — derive a
    // capacity that's at least big enough to hold every seat already placed.
    podRows: meta.podRows ?? Math.max(1, Math.ceil(seatCount / (podCols * 4))),
    seatCount,
  };
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    description: room.description ?? undefined,
    floor: meta.floor ?? "",
    layout,
    features: meta.features ?? [],
  };
}

export function mapSeat(seat: PrismaSeat): Seat {
  return {
    id: seat.id,
    code: seat.code,
    roomId: seat.roomId,
    seqNo: seat.seqNo,
    status: seat.status.toLowerCase() as SeatStatus,
    occupantMemberId: seat.occupantMemberId ?? undefined,
    groupId: seat.groupId ?? undefined,
    projectId: seat.projectId ?? undefined,
    posX: seat.posX,
    posY: seat.posY,
  };
}

export function mapDevice(device: PrismaDevice): Device {
  return {
    id: device.id,
    name: device.name,
    type: device.type as DeviceType,
    inventoryNumber: device.inventoryNumber,
    mac: device.mac ?? "",
    ownerMemberId: device.ownerMemberId,
    seatId: device.seatId ?? null,
    role: device.role.toLowerCase() as DeviceRole,
  };
}

function mapGroup(group: PrismaGroup): Group {
  return { id: group.id, name: group.name, color: group.color };
}

function mapProject(project: PrismaProject): Project {
  return { id: project.id, code: project.code, name: project.name };
}

/** Members without an Account have no login, hence no elevated role. */
export function mapMember(member: MemberWithAccount): Member {
  return {
    id: member.id,
    name: member.name,
    employeeCode: member.employeeCode ?? "",
    accountId: member.account?.id,
    role: member.account ? (member.account.role.toLowerCase() as Role) : "user",
    groupId: member.groupId ?? undefined,
  };
}

function mapSeatRequest(request: PrismaSeatRequest): SeatRequest {
  return {
    id: request.id,
    status: request.status.toLowerCase() as RequestStatus,
    subjectMemberId: request.subjectMemberId,
    seatId: request.seatId,
    createdByMemberId: request.createdByMemberId,
    decidedByMemberId: request.decidedByMemberId ?? undefined,
    note: request.note ?? undefined,
    decidedAt: request.decidedAt?.toISOString(),
    createdAt: request.createdAt.toISOString(),
  };
}

export async function getRooms(): Promise<Room[]> {
  const rooms = await prisma.room.findMany({ orderBy: { code: "asc" } });
  return rooms.map(mapRoom);
}

export async function getRoom(code: string): Promise<Room | undefined> {
  const room = await prisma.room.findUnique({ where: { code } });
  return room ? mapRoom(room) : undefined;
}

export async function getSeatsByRoom(roomId: string): Promise<Seat[]> {
  const seats = await prisma.seat.findMany({
    where: { roomId },
    orderBy: { seqNo: "asc" },
  });
  return seats.map(mapSeat);
}

export async function getSeat(code: string): Promise<Seat | undefined> {
  const seat = await prisma.seat.findUnique({ where: { code } });
  return seat ? mapSeat(seat) : undefined;
}

export type DeviceFilter = "all" | "placed" | "inventory";

export async function getDevices(filter: DeviceFilter = "all"): Promise<Device[]> {
  const where =
    filter === "placed"
      ? { seatId: { not: null } }
      : filter === "inventory"
        ? { seatId: null }
        : {};
  const devices = await prisma.device.findMany({ where, orderBy: { name: "asc" } });
  return devices.map(mapDevice);
}

export async function getMembers(): Promise<Member[]> {
  const members = await prisma.member.findMany({
    include: { account: true },
    orderBy: { name: "asc" },
  });
  return members.map(mapMember);
}

export async function getGroups(): Promise<Group[]> {
  const groups = await prisma.group.findMany({ orderBy: { name: "asc" } });
  return groups.map(mapGroup);
}

export async function getProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
  return projects.map(mapProject);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await getSessionUser();
  if (!session?.memberId) {
    throw new Error("No signed-in member for the current session.");
  }
  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    include: { account: true },
  });
  if (!member) {
    throw new Error("Signed-in account has no linked member.");
  }
  return { member: mapMember(member), role: session.role };
}

export type SeatRequestFilter = RequestStatus | "all";

export async function getSeatRequests(filter: SeatRequestFilter = "all"): Promise<SeatRequest[]> {
  const where = filter === "all" ? {} : { status: filter.toUpperCase() as PrismaSeatRequest["status"] };
  const requests = await prisma.seatRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return requests.map(mapSeatRequest);
}

export interface DashboardSummary {
  totalSeats: number;
  occupied: number;
  rate: number;
  devicesPlaced: number;
  devicesInInventory: number;
  devicesTotal: number;
  perRoom: { roomId: string; code: string; name: string; floor: string; occupied: number; total: number }[];
}

/** Occupancy + device stats computed server-side (DB aggregates), for the
 * dashboard — replaces the client-side `useMemo` reduction over full arrays. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [rooms, totalSeats, occupied, devicesTotal, devicesPlaced, occupiedByRoom] =
    await Promise.all([
      prisma.room.findMany({ orderBy: { code: "asc" } }),
      prisma.seat.count(),
      prisma.seat.count({ where: { status: "OCCUPIED" } }),
      prisma.device.count(),
      prisma.device.count({ where: { seatId: { not: null } } }),
      prisma.seat.groupBy({ by: ["roomId"], where: { status: "OCCUPIED" }, _count: { _all: true } }),
    ]);

  const occupiedMap = new Map(occupiedByRoom.map((o) => [o.roomId, o._count._all]));
  const perRoom = rooms.map((room) => {
    const mapped = mapRoom(room);
    return {
      roomId: mapped.id,
      code: mapped.code,
      name: mapped.name,
      floor: mapped.floor,
      occupied: occupiedMap.get(mapped.id) ?? 0,
      total: mapped.layout.seatCount,
    };
  });

  return {
    totalSeats,
    occupied,
    rate: totalSeats ? Math.round((occupied / totalSeats) * 100) : 0,
    devicesPlaced,
    devicesInInventory: devicesTotal - devicesPlaced,
    devicesTotal,
    perRoom,
  };
}

/**
 * One shot to seed the client store. Groups everything the SPA needs so the
 * store has a single, replaceable entry point.
 */
export async function getInitialData() {
  return {
    rooms: await getRooms(),
    seats: await prisma.seat.findMany().then((seats) => seats.map(mapSeat)),
    devices: await getDevices("all"),
    members: await getMembers(),
    groups: await getGroups(),
    projects: await getProjects(),
    currentUser: await getCurrentUser(),
    // Only pending requests — enough for the "request already pending" pill
    // on empty seats. The full history lives on the Approvals page.
    pendingRequests: await getSeatRequests("pending"),
  };
}

export type InitialData = Awaited<ReturnType<typeof getInitialData>>;
