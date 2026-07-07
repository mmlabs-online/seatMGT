/**
 * Domain model for the Seat & Device Tracker.
 *
 * These types are the single contract shared by the mock layer, the async
 * data-access layer, the client store, and the UI. When Prisma / an API lands
 * later, only `src/lib/data` changes — these shapes stay put.
 */

export type Role = "user" | "manager" | "admin";

/** Numeric rank used for UI gating (higher = more capable). */
export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  manager: 1,
  admin: 2,
};

export interface Member {
  id: string;
  name: string;
  employeeCode: string;
  /** Present once a member has a backing auth account (Better Auth later). */
  accountId?: string;
  role: Role;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  /** Brand color used for avatars, tags and seat accents. */
  color: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
}

/** Layout metadata a room needs to lay its seats out in a grid of pods. */
export interface RoomLayout {
  /** Number of 2x2 pods per row. */
  podCols: number;
  /** Number of 2x2 pod rows the room has available (its "walls") — the room's
   * capacity, independent of how many seats have actually been placed. */
  podRows: number;
  /** Actual number of placed seats (must be a multiple of 4 for clean pods). */
  seatCount: number;
}

export type RoomFeatureType = "door" | "window";

/** A movable, addable canvas marker (door / window) drawn on the room layout. */
export interface RoomFeature {
  id: string;
  type: RoomFeatureType;
  posX: number;
  posY: number;
}

export interface Room {
  id: string;
  code: string; // e.g. "C302"
  name: string;
  description?: string;
  floor: string;
  layout: RoomLayout;
  features: RoomFeature[];
}

export type SeatStatus = "empty" | "occupied";

export interface Seat {
  id: string;
  code: string; // room code + seq, e.g. "C302-01"
  roomId: string;
  seqNo: number;
  /**
   * Derived: a seat is "occupied" IFF it has an occupant. Never store this
   * independently — compute it from `occupantMemberId` (see `seatStatus`).
   */
  status: SeatStatus;
  occupantMemberId?: string;
  groupId?: string;
  projectId?: string;
  posX: number;
  posY: number;
}

export type DeviceRole = "primary" | "secondary";

export type DeviceType =
  | "Laptop"
  | "Monitor"
  | "Desktop"
  | "Dock"
  | "VoIP Phone"
  | "Tablet";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  inventoryNumber: string;
  mac: string;
  ownerMemberId: string;
  /** null / undefined => unassigned, sitting in inventory. */
  seatId?: string | null;
  role: DeviceRole;
}

/** A member together with the role they are currently acting as. */
export interface CurrentUser {
  member: Member;
  role: Role;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/** A User's request to occupy a seat, awaiting Manager/Admin approval. */
export interface SeatRequest {
  id: string;
  status: RequestStatus;
  subjectMemberId: string;
  seatId: string;
  createdByMemberId: string;
  decidedByMemberId?: string;
  note?: string;
  decidedAt?: string;
  createdAt: string;
}

/** Business rule: status is derived, never stored. */
export function seatStatus(occupantMemberId?: string | null): SeatStatus {
  return occupantMemberId ? "occupied" : "empty";
}
