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

export function generateLayout(layout: RoomLayout): LayoutGeometry {
  const { podCols, seatCount } = layout;
  const pods = seatCount / 4;
  const podRows = Math.ceil(pods / podCols);
  const positions: SeatPosition[] = [];
  let seq = 0;

  for (let pr = 0; pr < podRows; pr++) {
    for (let pc = 0; pc < podCols; pc++) {
      if (pr * podCols + pc >= pods) continue;
      for (let ly = 0; ly < 2; ly++) {
        for (let lx = 0; lx < 2; lx++) {
          seq++;
          const gcol = pc * 2 + lx;
          const grow = pr * 2 + ly;
          positions.push({
            seqNo: seq,
            posX: PAD + gcol * (SEAT_TILE + GAP) + pc * POD_GAP_X,
            posY: PAD + grow * (SEAT_TILE + GAP) + pr * POD_GAP_Y,
          });
        }
      }
    }
  }

  const width =
    PAD * 2 + podCols * 2 * (SEAT_TILE + GAP) - GAP + (podCols - 1) * POD_GAP_X;
  const height =
    PAD * 2 + podRows * 2 * (SEAT_TILE + GAP) - GAP + (podRows - 1) * POD_GAP_Y;

  return { positions, width, height, tile: SEAT_TILE };
}
