import type { RoomLayout } from "@/types";

/**
 * Pod-based seat geometry, ported from the imported SeatMap design so the
 * Room Layout View renders pixel-identical pods. Seats are laid out in 2x2
 * pods; `podCols` pods sit across each row.
 */
export const SEAT_TILE = 84;
const GAP = 10;
const POD_GAP_X = 42;
const POD_GAP_Y = 42;
const PAD = 30;

export const FEATURE_TILE_WIDTH = 68;
export const FEATURE_TILE_HEIGHT = 40;

export interface SeatPosition {
  seqNo: number;
  posX: number;
  posY: number;
}

export interface LayoutGeometry {
  positions: SeatPosition[];
  width: number;
  height: number;
  tile: number;
}

/** Pixel position of the 4 seats belonging to pod (pr, pc), in (ly, lx) row-major
 * order — i.e. top-left, top-right, bottom-left, bottom-right within the pod. Shared
 * by `generateLayout` and the bulk row/column server actions so both agree on the
 * exact same geometry without materializing a whole-grid layout. */
export function podTilePositions(pr: number, pc: number): { posX: number; posY: number }[] {
  const out: { posX: number; posY: number }[] = [];
  for (let ly = 0; ly < 2; ly++) {
    for (let lx = 0; lx < 2; lx++) {
      const gcol = pc * 2 + lx;
      const grow = pr * 2 + ly;
      out.push({
        posX: PAD + gcol * (SEAT_TILE + GAP) + pc * POD_GAP_X,
        posY: PAD + grow * (SEAT_TILE + GAP) + pr * POD_GAP_Y,
      });
    }
  }
  return out;
}

/** Pixel size of the room's available-space box for a given pod grid capacity
 * (podCols x podRows) — this is the "wall" boundary, independent of how many
 * seats are actually placed inside it. */
export function roomBounds(podCols: number, podRows: number): { width: number; height: number } {
  const width = PAD * 2 + podCols * 2 * (SEAT_TILE + GAP) - GAP + (podCols - 1) * POD_GAP_X;
  const height = PAD * 2 + podRows * 2 * (SEAT_TILE + GAP) - GAP + (podRows - 1) * POD_GAP_Y;
  return { width, height };
}

export function generateLayout(layout: RoomLayout): LayoutGeometry {
  const { podCols, seatCount } = layout;
  const pods = seatCount / 4;
  const podRows = Math.ceil(pods / podCols);
  const positions: SeatPosition[] = [];
  let seq = 0;

  for (let pr = 0; pr < podRows; pr++) {
    for (let pc = 0; pc < podCols; pc++) {
      if (pr * podCols + pc >= pods) continue;
      for (const { posX, posY } of podTilePositions(pr, pc)) {
        seq++;
        positions.push({ seqNo: seq, posX, posY });
      }
    }
  }

  const { width, height } = roomBounds(podCols, podRows);
  return { positions, width, height, tile: SEAT_TILE };
}

/** Constrains a proposed (x, y) top-left so the tile sits fully inside the
 * room, flush against whichever wall of the (0,0)-(width,height) boundary
 * box is nearest — not straddling the wall line, and never poking outside
 * it. Used to keep door/window markers wall-mounted rather than free-floating. */
export function snapToBorder(
  x: number,
  y: number,
  width: number,
  height: number,
  tileW: number,
  tileH: number,
): { posX: number; posY: number } {
  const maxX = Math.max(0, width - tileW);
  const maxY = Math.max(0, height - tileH);
  const cx = Math.min(Math.max(x, 0), maxX);
  const cy = Math.min(Math.max(y, 0), maxY);

  const distances = [
    { side: "top" as const, d: cy },
    { side: "bottom" as const, d: height - (cy + tileH) },
    { side: "left" as const, d: cx },
    { side: "right" as const, d: width - (cx + tileW) },
  ];
  const nearest = distances.reduce((a, b) => (b.d < a.d ? b : a));

  let posX = cx;
  let posY = cy;
  if (nearest.side === "top") posY = 0;
  else if (nearest.side === "bottom") posY = maxY;
  else if (nearest.side === "left") posX = 0;
  else posX = maxX;

  return { posX, posY };
}
