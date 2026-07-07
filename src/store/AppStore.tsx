"use client";

/**
 * Client-side store. Reads the request-scoped dataset seeded from the async
 * data layer (now Prisma-backed) and exposes the same lookups/selectors every
 * screen already used. Mutations call server actions; each action calls
 * `refresh()` server-side, which re-runs the (app) layout and feeds fresh
 * `initial` props back down here — so no local optimistic copies are kept for
 * server-owned collections. Only the theme toggle is genuinely client state.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Device, Group, Member, Project, Role, Room, RoomFeatureType, Seat, SeatRequest } from "@/types";
import { ROLE_RANK } from "@/types";
import type { InitialData } from "@/lib/data";
import { assignOccupant as assignOccupantAction, unassignOccupant as unassignOccupantAction } from "@/lib/actions/seats";
import { createSeatRequest } from "@/lib/actions/requests";
import { placeDevice as placeDeviceAction, moveDevice as moveDeviceAction } from "@/lib/actions/devices";
import {
  saveSeatPositions,
  createSeat,
  deleteSeat,
  createRoom as createRoomAction,
  addRoomRow as addRoomRowAction,
  addRoomColumn as addRoomColumnAction,
  addRoomFeature as addRoomFeatureAction,
  moveRoomFeature as moveRoomFeatureAction,
  deleteRoomFeature as deleteRoomFeatureAction,
  type RoomInput,
} from "@/lib/actions/rooms";

type Theme = "light" | "dark";

interface AppStoreValue {
  // data
  rooms: Room[];
  seats: Seat[];
  devices: Device[];
  members: Member[];
  groups: Group[];
  projects: Project[];
  currentUser: Member;
  role: Role;
  rank: number;
  theme: Theme;
  pendingRequests: SeatRequest[];

  // lookups
  roomByCode: (code: string) => Room | undefined;
  roomById: (id: string) => Room | undefined;
  seatsForRoom: (roomId: string) => Seat[];
  seatByCode: (code: string) => Seat | undefined;
  occupantOf: (seat: Seat | undefined) => Member | undefined;
  devicesAtSeat: (seatId: string) => Device[];
  memberById: (id: string) => Member | undefined;
  groupById: (id?: string) => Group | undefined;
  projectById: (id?: string) => Project | undefined;
  seatsOccupiedBy: (memberId: string) => number;
  devicesOwnedBy: (memberId: string) => number;
  pendingRequestForSeat: (seatId: string) => SeatRequest | undefined;

  // mutations (server actions under the hood)
  toggleTheme: () => void;
  assignOccupant: (seatId: string, memberId: string) => Promise<void>;
  requestSeat: (seatId: string) => Promise<void>;
  removeOccupant: (seatId: string) => Promise<void>;
  placeDevice: (seatId: string, deviceId: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;

  // layout designer (Admin only — re-enforced server-side regardless of role here)
  moveSeat: (seatId: string, posX: number, posY: number) => Promise<void>;
  addRoom: (input: RoomInput) => Promise<void>;
  addSeat: (roomId: string) => Promise<void>;
  deleteSeatAdmin: (seatId: string) => Promise<void>;
  addRoomRow: (roomId: string) => Promise<void>;
  addRoomColumn: (roomId: string) => Promise<void>;
  addRoomFeature: (roomId: string, type: RoomFeatureType) => Promise<void>;
  moveRoomFeature: (roomId: string, featureId: string, posX: number, posY: number) => Promise<void>;
  deleteRoomFeature: (roomId: string, featureId: string) => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

/** No existing error-surface component covers action rejects (permission
 * denials, "primary must be owned by the occupant", etc.) — a plain alert is
 * the minimal, non-restyling way to surface them for this pass. */
async function runAction(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "That action failed.");
  }
}

export function AppStoreProvider({
  initial,
  children,
}: {
  initial: InitialData;
  children: ReactNode;
}) {
  const { rooms, groups, projects, members, seats, devices, pendingRequests, currentUser: currentUserWrapper } = initial;
  const currentUser = currentUserWrapper.member;
  const role = currentUserWrapper.role;
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const memberById = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members],
  );

  const value = useMemo<AppStoreValue>(() => {
    const roomByCode = (code: string) => rooms.find((r) => r.code === code);
    const roomById = (id: string) => rooms.find((r) => r.id === id);
    const seatsForRoom = (roomId: string) =>
      seats.filter((s) => s.roomId === roomId);
    const seatByCode = (code: string) => seats.find((s) => s.code === code);
    const occupantOf = (seat: Seat | undefined) =>
      seat?.occupantMemberId ? memberById(seat.occupantMemberId) : undefined;
    const devicesAtSeat = (seatId: string) =>
      devices.filter((d) => d.seatId === seatId);
    const groupById = (id?: string) =>
      id ? groups.find((g) => g.id === id) : undefined;
    const projectById = (id?: string) =>
      id ? projects.find((p) => p.id === id) : undefined;
    const seatsOccupiedBy = (memberId: string) =>
      seats.filter((s) => s.occupantMemberId === memberId).length;
    const devicesOwnedBy = (memberId: string) =>
      devices.filter((d) => d.ownerMemberId === memberId).length;
    const pendingRequestForSeat = (seatId: string) =>
      pendingRequests.find((r) => r.seatId === seatId);

    return {
      rooms,
      seats,
      devices,
      members,
      groups,
      projects,
      currentUser,
      role,
      rank: ROLE_RANK[role],
      theme,
      pendingRequests,

      roomByCode,
      roomById,
      seatsForRoom,
      seatByCode,
      occupantOf,
      devicesAtSeat,
      memberById,
      groupById,
      projectById,
      seatsOccupiedBy,
      devicesOwnedBy,
      pendingRequestForSeat,

      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),

      assignOccupant: (seatId, memberId) =>
        runAction(() => assignOccupantAction(seatId, memberId)),

      requestSeat: (seatId) => runAction(() => createSeatRequest(seatId)),

      removeOccupant: (seatId) => runAction(() => unassignOccupantAction(seatId)),

      // Placing from inventory attaches as a borrowed secondary device.
      placeDevice: (seatId, deviceId) =>
        runAction(() => placeDeviceAction(deviceId, seatId, "SECONDARY")),

      removeDevice: (deviceId) => runAction(() => moveDeviceAction(deviceId, null)),

      moveSeat: (seatId, posX, posY) =>
        runAction(() => saveSeatPositions([{ id: seatId, posX, posY }])),

      // Declares the room, then populates it with `seatCount` real seats
      // (one createSeat call per seat, auto-positioned pod by pod) so the
      // layout is immediately usable instead of just a capacity number.
      addRoom: (input) =>
        runAction(async () => {
          const room = await createRoomAction(input);
          for (let i = 0; i < input.seatCount; i++) {
            await createSeat(room.id);
          }
        }),

      addSeat: (roomId) => runAction(() => createSeat(roomId).then(() => {})),

      deleteSeatAdmin: (seatId) => runAction(() => deleteSeat(seatId)),

      addRoomRow: (roomId) => runAction(() => addRoomRowAction(roomId)),

      addRoomColumn: (roomId) => runAction(() => addRoomColumnAction(roomId)),

      addRoomFeature: (roomId, type) => runAction(() => addRoomFeatureAction(roomId, type)),

      moveRoomFeature: (roomId, featureId, posX, posY) =>
        runAction(() => moveRoomFeatureAction(roomId, featureId, posX, posY)),

      deleteRoomFeature: (roomId, featureId) => runAction(() => deleteRoomFeatureAction(roomId, featureId)),
    };
  }, [rooms, seats, devices, members, groups, projects, pendingRequests, currentUser, role, theme, memberById]);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within <AppStoreProvider>");
  }
  return ctx;
}
