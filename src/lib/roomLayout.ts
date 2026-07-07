/**
 * Shared, framework-agnostic contract for the **Room Layout Editor** (the
 * primary free-form `/rooms/[roomCode]/edit` page). Pure types + constants + helpers
 * only — no `server-only`, no React — so both the server data seam
 * (`src/lib/data/roomLayout.ts`) and the client editor can import it.
 *
 * v2 is FREE-FORM: seats/fixtures carry continuous pixel coords (`x`,`y`) +
 * `rotation`, not grid cells. It is separate from the original pod-based
 * `src/lib/layout.ts`, whose editor is untouched.
 */

/** Non-seat things placed on the canvas. Includes both `door` and `window`
 * (the two the original editor supports) plus richer optional types. */
export type FixtureType =
  | "door"
  | "window"
  | "room"
  | "stairs"
  | "elevator"
  | "server"
  | "cabinet"
  | "pillar"
  | "blocked"
  | "label";

/** One non-seat element persisted in `Room.layoutFixtures` (a JSON array).
 * Free-form: `x`/`y`/`w`/`h` are pixels on the canvas. */
export interface Fixture {
  id: string;
  type: FixtureType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  label?: string;
  color?: string;
}

/** A seat enriched with free-form placement + **read-only** derived occupancy.
 * The editor positions seats; it never assigns occupants or devices, so
 * `status`/`occupantName`/`deviceCount` are display-only. */
export interface SeatWithLayout {
  id: string;
  code: string;
  seqNo: number;
  x: number;
  y: number;
  rotation: number;
  /** Resolved card size (defaults to SEAT_W/SEAT_H). */
  w: number;
  h: number;
  cannotSeat: boolean;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  status: "empty" | "occupied";
  occupantName?: string;
  deviceCount: number;
}

export interface RoomLayoutData {
  room: { id: string; code: string; name: string; floor: string };
  seats: SeatWithLayout[];
  fixtures: Fixture[];
}

/** Seat card size — matches the original editor's tile (SEAT_TILE = 84). */
export const SEAT_W = 84;
export const SEAT_H = 84;

/** Spacing used only by the "Add row / Add column" convenience helpers, which
 * drop a line of seats that are then **freely movable** (not locked to a grid). */
export const SEAT_PITCH = 96;

/** Fine snap step (px) for the optional snap toggle. The grid is a visual
 * reference only — never a placement constraint. */
export const FINE_SNAP = 8;
export const GRID_REF = 32;

/** Legacy conversion: my v1 grid editor stored fixtures/seats in `col/row`
 * cells of this size. Used only to gracefully convert any pre-v2 data. */
export const GRID_CELL = 64;

export interface FixtureMeta {
  icon: string;
  label: string;
  /** Default pixel size when created from the toolbar. */
  w: number;
  h: number;
  color: string;
}

/** Per-type presentation + default size (px). Colors are muted so seats (which
 * carry the vivid group tints) stay the visual focus. */
export const FIXTURE_META: Record<FixtureType, FixtureMeta> = {
  door: { icon: "sensor_door", label: "Door", w: 64, h: 26, color: "#FBEEE6" },
  window: { icon: "window", label: "Window", w: 72, h: 18, color: "#E7F3FA" },
  room: { icon: "meeting_room", label: "Room", w: 260, h: 170, color: "#E7F0FA" },
  stairs: { icon: "stairs", label: "Stairs", w: 120, h: 120, color: "#ECECEC" },
  elevator: { icon: "elevator", label: "Elevator", w: 70, h: 120, color: "#E7F3FA" },
  server: { icon: "dns", label: "Server", w: 60, h: 60, color: "#E7EAF6" },
  cabinet: { icon: "inventory_2", label: "Cabinet", w: 60, h: 110, color: "#F1EEE7" },
  pillar: { icon: "crop_square", label: "Pillar", w: 44, h: 44, color: "#E2E2E0" },
  blocked: { icon: "block", label: "Blocked", w: 60, h: 60, color: "#F4E4E4" },
  label: { icon: "label", label: "Label", w: 120, h: 40, color: "#F0F0EF" },
};

/** Toolbar "add" sources. `seat` creates a real Seat (auto port code); the rest
 * append a Fixture. Door + Window lead, matching the original editor. */
export const PALETTE: Array<{ key: "seat" | FixtureType; icon: string; label: string }> = [
  { key: "seat", icon: "chair", label: "Seat" },
  { key: "door", icon: FIXTURE_META.door.icon, label: FIXTURE_META.door.label },
  { key: "window", icon: FIXTURE_META.window.icon, label: FIXTURE_META.window.label },
  { key: "room", icon: FIXTURE_META.room.icon, label: FIXTURE_META.room.label },
  { key: "stairs", icon: FIXTURE_META.stairs.icon, label: FIXTURE_META.stairs.label },
  { key: "elevator", icon: FIXTURE_META.elevator.icon, label: FIXTURE_META.elevator.label },
  { key: "server", icon: FIXTURE_META.server.icon, label: FIXTURE_META.server.label },
  { key: "cabinet", icon: FIXTURE_META.cabinet.icon, label: FIXTURE_META.cabinet.label },
  { key: "pillar", icon: FIXTURE_META.pillar.icon, label: FIXTURE_META.pillar.label },
  { key: "blocked", icon: FIXTURE_META.blocked.icon, label: FIXTURE_META.blocked.label },
];

/** Builds a fresh fixture at a pixel point with the type's default size/tint. */
export function newFixture(id: string, type: FixtureType, x: number, y: number): Fixture {
  const meta = FIXTURE_META[type];
  return { id, type, x: Math.round(x), y: Math.round(y), w: meta.w, h: meta.h, rotation: 0, color: meta.color };
}

/** Snap a value to `step` px (used when the fine-snap toggle is on). */
export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}
