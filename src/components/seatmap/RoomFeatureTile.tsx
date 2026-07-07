"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { RoomFeature } from "@/types";
import { FEATURE_TILE_HEIGHT, FEATURE_TILE_WIDTH } from "@/lib/layout";
import { Icon } from "@/components/ui";

const DRAG_THRESHOLD = 4;

const LABEL: Record<RoomFeature["type"], string> = { door: "Door", window: "Window" };
const ICON: Record<RoomFeature["type"], string> = { door: "sensor_door", window: "window" };

/**
 * Draggable door/window marker (Pointer Events drag pattern ported from
 * `SeatTile`). Only draggable in edit mode; shows an inline delete badge
 * while editing since there's no per-feature detail panel to hang a delete
 * action off of.
 */
export function RoomFeatureTile({
  feature,
  editMode,
  zoom = 1,
  posOverride,
  onDragMove,
  onDragEnd,
  onDelete,
}: {
  feature: RoomFeature;
  editMode: boolean;
  zoom?: number;
  posOverride?: { posX: number; posY: number };
  onDragMove?: (posX: number, posY: number) => void;
  onDragEnd?: (posX: number, posY: number) => void;
  onDelete?: () => void;
}) {
  const posX = posOverride?.posX ?? feature.posX;
  const posY = posOverride?.posY ?? feature.posY;

  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    // Don't start a drag (and don't steal the pointer via setPointerCapture)
    // when the press originates on the nested delete button — capturing the
    // pointer on the outer div retargets the ensuing click away from that
    // button, silently swallowing the delete.
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY, posX, posY };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode || !startRef.current) return;
    const dx = (e.clientX - startRef.current.x) / zoom;
    const dy = (e.clientY - startRef.current.y) / zoom;
    if (!draggingRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    draggingRef.current = true;
    onDragMove?.(Math.max(0, startRef.current.posX + dx), Math.max(0, startRef.current.posY + dy));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode || !startRef.current) return;
    if (draggingRef.current) {
      const dx = (e.clientX - startRef.current.x) / zoom;
      const dy = (e.clientY - startRef.current.y) / zoom;
      onDragEnd?.(Math.max(0, startRef.current.posX + dx), Math.max(0, startRef.current.posY + dy));
    }
    startRef.current = null;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label={LABEL[feature.type]}
      className={[
        "absolute flex items-center justify-center gap-1.5 rounded-md3 border border-dashed",
        "bg-surface text-on-surface-variant border-outline",
        editMode ? "cursor-grab active:cursor-grabbing" : "",
      ].join(" ")}
      style={{
        left: posX,
        top: posY,
        width: FEATURE_TILE_WIDTH,
        height: FEATURE_TILE_HEIGHT,
        // Above seat tiles (which top out at zIndex 2 when selected) so a
        // feature dragged over/under a seat stays visible and clickable.
        zIndex: 3,
        touchAction: editMode ? "none" : undefined,
      }}
    >
      <Icon name={ICON[feature.type]} size={18} />
      <span className="text-[11px] font-bold">{LABEL[feature.type]}</span>
      {editMode && (
        <button
          type="button"
          data-no-drag
          onClick={onDelete}
          aria-label={`Remove ${LABEL[feature.type].toLowerCase()}`}
          className="state-layer absolute -top-2 -right-2 w-5 h-5 rounded-full bg-error-container text-on-error-container border border-error/30 flex items-center justify-center cursor-pointer"
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}
