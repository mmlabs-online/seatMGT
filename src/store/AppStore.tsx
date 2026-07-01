"use client";

/**
 * Client-side store. Holds the runtime-mutable dataset seeded from the async
 * data layer, plus the demoed role and the light/dark theme. Every screen
 * reads from here so mutations (assign seat, place device, switch role) stay
 * consistent across route changes without a DB.
 *
 * Swap plan: the seed comes from `getInitialData()`; the mutations below become
 * server actions / API calls later. Components keep using these selectors.
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
import type {
  Device,
  DeviceRole,
  Group,
  Member,
  Project,
  Role,
  Room,
  Seat,
} from "@/types";
import { ROLE_RANK, seatStatus } from "@/types";
import type { InitialData } from "@/lib/data";

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

  // mutations (local-only for this UI pass)
  setRole: (role: Role) => void;
  toggleTheme: () => void;
  assignOccupant: (seatId: string, memberId: string) => void;
  registerSelf: (seatId: string) => void;
  removeOccupant: (seatId: string) => void;
  placeDevice: (seatId: string, deviceId: string) => void;
  removeDevice: (deviceId: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({
  initial,
  children,
}: {
  initial: InitialData;
  children: ReactNode;
}) {
  const [rooms] = useState<Room[]>(initial.rooms);
  const [groups] = useState<Group[]>(initial.groups);
  const [projects] = useState<Project[]>(initial.projects);
  const [members] = useState<Member[]>(initial.members);
  const [seats, setSeats] = useState<Seat[]>(initial.seats);
  const [devices, setDevices] = useState<Device[]>(initial.devices);
  const [role, setRole] = useState<Role>(initial.currentUser.role);
  const [theme, setTheme] = useState<Theme>("light");

  const currentUser = initial.currentUser.member;

  // Reflect the theme onto <html data-theme> so the MD3 token layer swaps.
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

      setRole,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),

      assignOccupant: (seatId, memberId) =>
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  occupantMemberId: memberId,
                  status: seatStatus(memberId),
                  groupId: memberById(memberId)?.groupId ?? s.groupId,
                }
              : s,
          ),
        ),

      registerSelf: (seatId) =>
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  occupantMemberId: currentUser.id,
                  status: "occupied",
                  groupId: currentUser.groupId ?? s.groupId,
                }
              : s,
          ),
        ),

      // Clearing an occupant returns any primary device to inventory, since a
      // primary must be owned by the seat's occupant.
      removeOccupant: (seatId) => {
        setDevices((prev) =>
          prev.map((d) =>
            d.seatId === seatId && d.role === "primary"
              ? { ...d, seatId: null }
              : d,
          ),
        );
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seatId
              ? { ...s, occupantMemberId: undefined, status: "empty", projectId: undefined }
              : s,
          ),
        );
      },

      // Placing from inventory attaches as a borrowed secondary device.
      placeDevice: (seatId, deviceId) =>
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, seatId, role: "secondary" as DeviceRole } : d,
          ),
        ),

      removeDevice: (deviceId) =>
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, seatId: null } : d,
          ),
        ),
    };
  }, [
    rooms,
    seats,
    devices,
    members,
    groups,
    projects,
    currentUser,
    role,
    theme,
    memberById,
  ]);

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

/** Shared helpers used across screens. */
export function initials(name: string): string {
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/);
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
  );
}

export function lastName(name: string): string {
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}
