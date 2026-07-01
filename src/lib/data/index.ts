/**
 * Async data-access layer — the ONLY module UI/store code imports for data.
 *
 * Every function is async and returns fresh copies, so callers can treat this
 * exactly like a network/DB boundary. When Prisma or an API lands, these
 * implementations get rewritten with the SAME signatures and nothing upstream
 * changes.
 */
import type {
  CurrentUser,
  Device,
  Group,
  Member,
  Project,
  Room,
  Seat,
} from "@/types";
import * as mock from "@/lib/mock/data";

/** Simulate a tiny async boundary + hand back a deep clone. */
async function resolve<T>(value: T): Promise<T> {
  return structuredClone(value);
}

export async function getRooms(): Promise<Room[]> {
  return resolve(mock.rooms);
}

export async function getRoom(code: string): Promise<Room | undefined> {
  return resolve(mock.rooms.find((r) => r.code === code));
}

export async function getSeatsByRoom(roomId: string): Promise<Seat[]> {
  return resolve(mock.seats.filter((s) => s.roomId === roomId));
}

export async function getSeat(code: string): Promise<Seat | undefined> {
  return resolve(mock.seats.find((s) => s.code === code));
}

export type DeviceFilter = "all" | "placed" | "inventory";

export async function getDevices(
  filter: DeviceFilter = "all",
): Promise<Device[]> {
  const list = mock.devices.filter((d) => {
    if (filter === "placed") return !!d.seatId;
    if (filter === "inventory") return !d.seatId;
    return true;
  });
  return resolve(list);
}

export async function getMembers(): Promise<Member[]> {
  return resolve(mock.members);
}

export async function getGroups(): Promise<Group[]> {
  return resolve(mock.groups);
}

export async function getProjects(): Promise<Project[]> {
  return resolve(mock.projects);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const member =
    mock.members.find((m) => m.id === mock.currentUserId) ?? mock.members[0];
  return resolve({ member, role: member.role });
}

/**
 * One shot to seed the client store. Groups everything the SPA needs so the
 * store has a single, replaceable entry point.
 */
export async function getInitialData() {
  return {
    rooms: await getRooms(),
    seats: await resolve(mock.seats),
    devices: await getDevices("all"),
    members: await getMembers(),
    groups: await getGroups(),
    projects: await getProjects(),
    currentUser: await getCurrentUser(),
  };
}

export type InitialData = Awaited<ReturnType<typeof getInitialData>>;
