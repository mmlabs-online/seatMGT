/**
 * RAW mock data. Nothing outside `src/lib/data` should import this file.
 * Seats are *generated* from room layouts + an occupancy seed (see below) so
 * that seat status stays derived, never hand-authored.
 */
import type {
  Device,
  Group,
  Member,
  Project,
  Room,
  Seat,
} from "@/types";
import { seatStatus } from "@/types";
import { generateLayout } from "@/lib/layout";

export const groups: Group[] = [
  { id: "g-platform", name: "Platform", color: "#5B6CF0" },
  { id: "g-design", name: "Design", color: "#C05BB0" },
  { id: "g-data", name: "Data", color: "#1E9E9E" },
  { id: "g-qa", name: "QA", color: "#C08A1E" },
  { id: "g-growth", name: "Growth", color: "#3E9E5B" },
];

export const projects: Project[] = [
  { id: "p-atlas", code: "ATL", name: "Atlas" },
  { id: "p-falcon", code: "FAL", name: "Falcon" },
  { id: "p-orbit", code: "ORB", name: "Orbit" },
];

export const rooms: Room[] = [
  {
    id: "r-c302",
    code: "C302",
    name: "Engineering Bay",
    description: "Main engineering floor — each seat maps to one network port.",
    floor: "Floor 3",
    layout: { podCols: 3, podRows: 2, seatCount: 24 },
    features: [],
  },
  {
    id: "r-c310",
    code: "C310",
    name: "Product Studio",
    description: "Product, design and research pods.",
    floor: "Floor 3",
    layout: { podCols: 2, podRows: 2, seatCount: 16 },
    features: [],
  },
  {
    id: "r-d145",
    code: "D145",
    name: "Ops Room",
    description: "Operations and on-call desks.",
    floor: "Floor 1",
    layout: { podCols: 3, podRows: 1, seatCount: 12 },
    features: [],
  },
];

export const members: Member[] = [
  { id: "you", name: "Sam Rivera", employeeCode: "EMP-000", role: "admin", groupId: "g-platform", accountId: "acc-you" },
  { id: "m1", name: "Ada Lovelace", employeeCode: "EMP-001", role: "admin", groupId: "g-platform" },
  { id: "m2", name: "Grace Hopper", employeeCode: "EMP-002", role: "manager", groupId: "g-platform" },
  { id: "m3", name: "Alan Turing", employeeCode: "EMP-003", role: "user", groupId: "g-data" },
  { id: "m4", name: "Donald Knuth", employeeCode: "EMP-004", role: "user", groupId: "g-platform" },
  { id: "m5", name: "Katherine Johnson", employeeCode: "EMP-005", role: "user", groupId: "g-data" },
  { id: "m6", name: "Linus Torvalds", employeeCode: "EMP-006", role: "user", groupId: "g-platform" },
  { id: "m7", name: "Vint Cerf", employeeCode: "EMP-007", role: "user", groupId: "g-growth" },
  { id: "m8", name: "Margaret Hamilton", employeeCode: "EMP-008", role: "manager", groupId: "g-qa" },
  { id: "m9", name: "Dennis Ritchie", employeeCode: "EMP-009", role: "user", groupId: "g-platform" },
  { id: "m10", name: "Barbara Liskov", employeeCode: "EMP-010", role: "user", groupId: "g-design" },
  { id: "m11", name: "Jeff Dean", employeeCode: "EMP-011", role: "manager", groupId: "g-platform" },
  { id: "m12", name: "Radia Perlman", employeeCode: "EMP-012", role: "user", groupId: "g-data" },
  { id: "m13", name: "Sophie Wilson", employeeCode: "EMP-013", role: "user", groupId: "g-design" },
  { id: "m14", name: "Frances Allen", employeeCode: "EMP-014", role: "user", groupId: "g-qa" },
  { id: "m15", name: "Ken Thompson", employeeCode: "EMP-015", role: "user", groupId: "g-platform" },
  { id: "m16", name: "Guido van Rossum", employeeCode: "EMP-016", role: "user", groupId: "g-data" },
];

/**
 * Occupancy seed: seat code -> occupant + optional project override.
 * The seat's group is inherited from the occupant's group unless overridden.
 * A member appearing more than once demonstrates "one person, many seats".
 */
interface SeatSeed {
  memberId: string;
  projectId?: string;
}
const occupancy: Record<string, SeatSeed> = {
  "C302-01": { memberId: "m1" },
  "C302-02": { memberId: "m2" },
  "C302-03": { memberId: "m3" },
  "C302-04": { memberId: "m4" },
  "C302-05": { memberId: "m5" },
  "C302-06": { memberId: "m6" },
  "C302-07": { memberId: "m7" },
  "C302-08": { memberId: "m8", projectId: "p-falcon" },
  "C302-09": { memberId: "m9" },
  "C302-11": { memberId: "m10" },
  "C302-13": { memberId: "m11", projectId: "p-atlas" },
  "C302-14": { memberId: "m13" },
  "C302-15": { memberId: "m14" },
  "C302-17": { memberId: "m15" },
  "C302-19": { memberId: "m1" }, // Ada's second seat
  "C302-22": { memberId: "m16" },

  "C310-01": { memberId: "m12", projectId: "p-orbit" },
  "C310-02": { memberId: "m5" },
  "C310-03": { memberId: "m3" },
  "C310-04": { memberId: "m6" },
  "C310-06": { memberId: "m10" },
  "C310-08": { memberId: "m16" },
  "C310-11": { memberId: "m15" },

  "D145-01": { memberId: "m8" },
  "D145-03": { memberId: "m9" },
  "D145-05": { memberId: "m4" },
  "D145-07": { memberId: "m7" },
  "D145-09": { memberId: "m11" },
};

/** Generate seats for every room from its layout + occupancy seed. */
export const seats: Seat[] = rooms.flatMap((room) => {
  const { positions } = generateLayout(room.layout);
  return positions.map(({ seqNo, posX, posY }) => {
    const code = `${room.code}-${String(seqNo).padStart(2, "0")}`;
    const seed = occupancy[code];
    const occupantMemberId = seed?.memberId;
    const occupant = occupantMemberId
      ? members.find((m) => m.id === occupantMemberId)
      : undefined;
    return {
      id: `seat-${code}`,
      code,
      roomId: room.id,
      seqNo,
      status: seatStatus(occupantMemberId),
      occupantMemberId,
      groupId: occupant?.groupId,
      projectId: seed?.projectId,
      posX,
      posY,
    } satisfies Seat;
  });
});

export const devices: Device[] = [
  { id: "d1", name: 'MacBook Pro 16"', type: "Laptop", inventoryNumber: "INV-40021", mac: "A4:83:E7:11:22:01", ownerMemberId: "m1", seatId: "seat-C302-01", role: "primary" },
  { id: "d2", name: "Dell U2723QE", type: "Monitor", inventoryNumber: "INV-40088", mac: "A4:83:E7:11:22:02", ownerMemberId: "m1", seatId: "seat-C302-01", role: "secondary" },
  { id: "d3", name: "CalDigit TS4", type: "Dock", inventoryNumber: "INV-40145", mac: "3C:22:FB:1A:0E:04", ownerMemberId: "m2", seatId: "seat-C302-02", role: "primary" },
  { id: "d4", name: 'MacBook Air 13"', type: "Laptop", inventoryNumber: "INV-40210", mac: "A4:83:E7:11:22:05", ownerMemberId: "m3", seatId: "seat-C302-03", role: "primary" },
  { id: "d5", name: "LG 27UP850", type: "Monitor", inventoryNumber: "INV-40233", mac: "5E:0C:99:2A:1B:06", ownerMemberId: "m5", seatId: "seat-C302-03", role: "secondary" },
  { id: "d6", name: "Poly CCX 350", type: "VoIP Phone", inventoryNumber: "INV-40301", mac: "9A:1D:44:7C:22:07", ownerMemberId: "m8", seatId: "seat-C302-08", role: "primary" },
  { id: "d7", name: "Precision 3660", type: "Desktop", inventoryNumber: "INV-40355", mac: "9A:1D:44:7C:22:08", ownerMemberId: "m6", seatId: "seat-C302-06", role: "primary" },
  { id: "d8", name: 'MacBook Pro 14"', type: "Laptop", inventoryNumber: "INV-40412", mac: "A4:83:E7:11:22:09", ownerMemberId: "m11", seatId: "seat-C302-13", role: "primary" },
  { id: "d9", name: "Dell U2723QE", type: "Monitor", inventoryNumber: "INV-40415", mac: "A4:83:E7:11:22:10", ownerMemberId: "m11", seatId: "seat-C302-13", role: "secondary" },
  { id: "d10", name: "ThinkPad T14", type: "Laptop", inventoryNumber: "INV-40501", mac: "3C:22:FB:1A:0E:11", ownerMemberId: "m12", seatId: "seat-C310-01", role: "primary" },
  { id: "d11", name: "Framework 13", type: "Laptop", inventoryNumber: "INV-40602", mac: "A4:83:E7:11:22:15", ownerMemberId: "m8", seatId: "seat-D145-01", role: "primary" },
  { id: "d12", name: 'iPad Pro 12.9"', type: "Tablet", inventoryNumber: "INV-40560", mac: "5E:0C:99:2A:1B:12", ownerMemberId: "m10", seatId: null, role: "secondary" },
  { id: "d13", name: "CalDigit TS4", type: "Dock", inventoryNumber: "INV-40566", mac: "3C:22:FB:1A:0E:13", ownerMemberId: "m15", seatId: null, role: "secondary" },
  { id: "d14", name: "LG 27UP850", type: "Monitor", inventoryNumber: "INV-40571", mac: "5E:0C:99:2A:1B:14", ownerMemberId: "m7", seatId: null, role: "secondary" },
  { id: "d15", name: "ThinkPad X1", type: "Laptop", inventoryNumber: "INV-40102", mac: "3C:22:FB:1A:0E:03", ownerMemberId: "m9", seatId: "seat-C302-09", role: "primary" },
];

/** The demo "logged-in" member. Role is overridable via the dev role switcher. */
export const currentUserId = "you";
