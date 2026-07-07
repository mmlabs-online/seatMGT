"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Group, Member, Seat } from "@/types";
import { SEAT_TILE } from "@/lib/layout";
import { initials, lastName } from "@/lib/format";
import { Icon } from "@/components/ui";

const DRAG_THRESHOLD = 4;

/**
 * Absolutely-positioned seat tile (ported from the imported SeatMap design).
 * Occupied seats fill with primary-container and show the occupant avatar;
 * empty seats are dashed with a chair glyph. Hover lifts, press scales.
 *
 * In edit mode, the tile is also draggable (Pointer Events) — screen-space
 * deltas are divided by `zoom` since the canvas is rendered inside a
 * `transform: scale(zoom)` wrapper.
 */
export function SeatTile({
  seat,
  occupant,
  group,
  deviceCount,
  selected,
  editMode,
  onSelect,
  zoom = 1,
  posOverride,
  onDragMove,
  onDragEnd,
}: {
  seat: Seat;
  occupant?: Member;
  group?: Group;
  deviceCount: number;
  selected: boolean;
  editMode: boolean;
  onSelect: () => void;
  zoom?: number;
  posOverride?: { posX: number; posY: number };
  onDragMove?: (posX: number, posY: number) => void;
  onDragEnd?: (posX: number, posY: number) => void;
}) {
  const occupied = !!occupant;
  const posX = posOverride?.posX ?? seat.posX;
  const posY = posOverride?.posY ?? seat.posY;

  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!editMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY, posX, posY };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!editMode || !startRef.current) return;
    const dx = (e.clientX - startRef.current.x) / zoom;
    const dy = (e.clientY - startRef.current.y) / zoom;
    if (!draggingRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    draggingRef.current = true;
    onDragMove?.(
      Math.max(0, startRef.current.posX + dx),
      Math.max(0, startRef.current.posY + dy),
    );
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!editMode || !startRef.current) return;
    if (draggingRef.current) {
      const dx = (e.clientX - startRef.current.x) / zoom;
      const dy = (e.clientY - startRef.current.y) / zoom;
      onDragEnd?.(
        Math.max(0, startRef.current.posX + dx),
        Math.max(0, startRef.current.posY + dy),
      );
    }
    startRef.current = null;
  };

  const handleClick = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      return;
    }
    onSelect();
  };

  // Occupied = solid-orange "featured" tile; empty = white tile + hairline.
  // Selected = black ring + elevation layered on top of either state.
  const boxShadow = selected
    ? "0 0 0 2px var(--primary), 0 8px 20px rgba(0,0,0,0.14)"
    : editMode
      ? "0 0 0 2px var(--tertiary)"
      : occupied
        ? "0 4px 14px rgba(251,87,41,0.3)"
        : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label={`Seat ${seat.code} — ${occupied ? `occupied by ${occupant?.name}` : "empty"}`}
      aria-pressed={selected}
      className={[
        "absolute flex flex-col justify-between p-[9px_10px] text-left font-[inherit] cursor-pointer",
        "rounded-md3-lg transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        "hover:-translate-y-[3px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)] active:scale-95",
        occupied
          ? "bg-primary-container text-on-primary-container border border-transparent"
          : "bg-surface-lowest text-on-surface-variant border border-outline-variant",
        editMode ? "cursor-grab active:cursor-grabbing" : "",
      ].join(" ")}
      style={{
        left: posX,
        top: posY,
        width: SEAT_TILE,
        height: SEAT_TILE,
        transform: selected ? "translateY(-2px)" : undefined,
        boxShadow,
        zIndex: selected ? 2 : undefined,
        touchAction: editMode ? "none" : undefined,
      }}
    >
      <span className="flex justify-between items-center">
        <span className="font-mono text-[11px] font-bold tracking-[0.05em] tabular-nums opacity-80">
          {String(seat.seqNo).padStart(2, "0")}
        </span>
        {occupied && group && (
          <span
            className="w-[9px] h-[9px] rounded-full"
            style={{ background: group.color }}
          />
        )}
      </span>

      {occupied ? (
        <span
          className="w-9 h-9 rounded-full text-white flex items-center justify-center text-[13px] font-extrabold self-center"
          style={{ background: group?.color ?? "var(--secondary)" }}
        >
          {initials(occupant.name)}
        </span>
      ) : (
        <Icon name="chair" size={26} className="opacity-35 self-center" />
      )}

      <span className="flex justify-between items-center text-[10px] font-bold">
        <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[52px] opacity-85">
          {occupied ? lastName(occupant.name) : "Empty"}
        </span>
        {deviceCount > 0 && (
          <span className="flex items-center gap-0.5 opacity-85">
            <Icon name="lan" size={13} />
            {deviceCount}
          </span>
        )}
      </span>
    </button>
  );
}
