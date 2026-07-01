"use client";

import type { Group, Member, Seat } from "@/types";
import { SEAT_TILE } from "@/lib/layout";
import { initials, lastName } from "@/store/AppStore";
import { Icon } from "@/components/ui";

/**
 * Absolutely-positioned seat tile (ported from the imported SeatMap design).
 * Occupied seats fill with primary-container and show the occupant avatar;
 * empty seats are dashed with a chair glyph. Hover lifts, press scales.
 */
export function SeatTile({
  seat,
  occupant,
  group,
  deviceCount,
  selected,
  editMode,
  onSelect,
}: {
  seat: Seat;
  occupant?: Member;
  group?: Group;
  deviceCount: number;
  selected: boolean;
  editMode: boolean;
  onSelect: () => void;
}) {
  const occupied = !!occupant;

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
      onClick={onSelect}
      aria-label={`Seat ${seat.code} — ${occupied ? `occupied by ${occupant?.name}` : "empty"}`}
      aria-pressed={selected}
      className={[
        "absolute flex flex-col justify-between p-[9px_10px] text-left font-[inherit] cursor-pointer",
        "rounded-md3-lg transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        "hover:-translate-y-[3px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)] active:scale-95",
        occupied
          ? "bg-primary-container text-on-primary-container border border-transparent"
          : "bg-surface-lowest text-on-surface-variant border border-outline-variant",
        editMode ? "cursor-grab" : "",
      ].join(" ")}
      style={{
        left: seat.posX,
        top: seat.posY,
        width: SEAT_TILE,
        height: SEAT_TILE,
        transform: selected ? "translateY(-2px)" : undefined,
        boxShadow,
        zIndex: selected ? 2 : undefined,
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
