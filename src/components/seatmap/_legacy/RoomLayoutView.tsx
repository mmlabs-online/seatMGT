"use client";

// ============================================================================
// ARCHIVED 2026-07-05 — legacy grid/arrange room editor.
//
// Superseded by the free-form editor (src/components/roomlayout/LayoutEditor)
// which is now the primary editor at /rooms/[roomCode]/edit. This component is
// kept intact and reachable ONLY at /rooms/[roomCode]/edit-legacy — nothing in
// the active UI links to it. It still reads the original editor's own fields
// (Seat.posX/posY + Room.layoutMeta.features) via the store.
//
// TO RESTORE as the primary room view: see src/components/seatmap/_legacy/README.md.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/AppStore";
import { ROLE_RANK } from "@/types";
import { FEATURE_TILE_HEIGHT, FEATURE_TILE_WIDTH, roomBounds, SEAT_TILE, snapToBorder } from "@/lib/layout";
import { Icon } from "@/components/ui";
import { SeatTile } from "../SeatTile";
import { SeatDetailPanel } from "../SeatDetailPanel";
import { RoomFeatureTile } from "../RoomFeatureTile";

export function RoomLayoutView({ roomCode }: { roomCode: string }) {
  const store = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [editLayout, setEditLayout] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<{ id: string; posX: number; posY: number } | null>(
    null,
  );
  const [featureDragState, setFeatureDragState] = useState<
    { id: string; posX: number; posY: number } | null
  >(null);

  const room = store.roomByCode(roomCode);

  if (!room) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant font-semibold">
          Room <b>{roomCode}</b> not found.{" "}
          <Link href="/rooms" className="text-primary underline">
            Back to rooms
          </Link>
        </p>
      </div>
    );
  }

  const seats = store.seatsForRoom(room.id).sort((a, b) => a.seqNo - b.seqNo);
  const { width, height } = roomBounds(room.layout.podCols, room.layout.podRows);
  const occCount = seats.filter((s) => s.occupantMemberId).length;
  const selectedCode = params.get("seat");
  const canEdit = store.rank >= ROLE_RANK.admin;

  const selectSeat = (code: string) =>
    router.push(`${pathname}?seat=${code}`, { scroll: false });

  const setZoomBy = (d: number) =>
    setZoom((z) => Math.min(1.4, Math.max(0.6, +(z + d).toFixed(2))));

  const clamp = (posX: number, posY: number, tileW = SEAT_TILE, tileH = SEAT_TILE) => ({
    posX: Math.min(Math.max(0, posX), Math.max(0, width - tileW)),
    posY: Math.min(Math.max(0, posY), Math.max(0, height - tileH)),
  });

  const handleDragMove = (seatId: string, posX: number, posY: number) => {
    const p = clamp(posX, posY);
    setDragState({ id: seatId, posX: p.posX, posY: p.posY });
  };

  const handleDragEnd = async (seatId: string, posX: number, posY: number) => {
    const p = clamp(posX, posY);
    setDragState({ id: seatId, posX: p.posX, posY: p.posY });
    await store.moveSeat(seatId, p.posX, p.posY);
    setDragState((cur) => (cur?.id === seatId ? null : cur));
  };

  // Door/window markers are wall-mounted — every drag position snaps onto
  // the room's border rather than clamping to the free-floating canvas box.
  const handleFeatureDragMove = (featureId: string, posX: number, posY: number) => {
    const p = snapToBorder(posX, posY, width, height, FEATURE_TILE_WIDTH, FEATURE_TILE_HEIGHT);
    setFeatureDragState({ id: featureId, posX: p.posX, posY: p.posY });
  };

  const handleFeatureDragEnd = async (featureId: string, posX: number, posY: number) => {
    const p = snapToBorder(posX, posY, width, height, FEATURE_TILE_WIDTH, FEATURE_TILE_HEIGHT);
    setFeatureDragState({ id: featureId, posX: p.posX, posY: p.posY });
    await store.moveRoomFeature(room.id, featureId, p.posX, p.posY);
    setFeatureDragState((cur) => (cur?.id === featureId ? null : cur));
  };

  const handleAddSeat = () => store.addSeat(room.id);
  const handleAddRow = () => store.addRoomRow(room.id);
  const handleAddColumn = () => store.addRoomColumn(room.id);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex-none px-6 pt-[18px] pb-3.5 flex flex-col gap-3.5 border-b border-outline-variant bg-surface">
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {store.rooms.map((r) => {
              const rSeats = store.seatsForRoom(r.id);
              const occ = rSeats.filter((s) => s.occupantMemberId).length;
              const active = r.code === room.code;
              return (
                <Link
                  key={r.code}
                  href={`/rooms/${r.code}`}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "state-layer flex items-center gap-2.5 px-[15px] py-[9px] rounded-md3 whitespace-nowrap no-underline font-[inherit] cursor-pointer border",
                    active
                      ? "bg-primary-container text-on-primary-container border-transparent"
                      : "bg-surface-low text-on-surface border-outline-variant",
                  ].join(" ")}
                >
                  <Icon name="meeting_room" size={18} />
                  <span className="flex flex-col items-start leading-[1.1]">
                    <span className="font-mono text-sm font-bold tracking-[0.02em]">{r.code}</span>
                    <span className="font-mono text-[10px] font-medium tabular-nums opacity-75">
                      {occ}/{r.layout.seatCount}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-surface text-on-surface border border-outline-variant px-3.5 py-2 rounded-md3 shadow-[var(--card-shadow)]">
              <span className="status-dot online" aria-hidden />
              <span
                className="text-[15px] font-extrabold tabular-nums"
                style={{ color: "var(--accent-orange)" }}
              >
                {occCount} / {room.layout.seatCount}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">occupied</span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditLayout((v) => !v)}
                aria-pressed={editLayout}
                className={[
                  "state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border",
                  editLayout
                    ? "bg-tertiary-container text-on-tertiary-container border-transparent"
                    : "bg-transparent text-on-surface border-outline",
                ].join(" ")}
              >
                <Icon name={editLayout ? "check" : "edit_note"} size={18} />
                {editLayout ? "Done arranging" : "Edit layout"}
              </button>
            )}
            {canEdit && editLayout && (
              <button
                type="button"
                onClick={handleAddSeat}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline"
              >
                <Icon name="add" size={18} />
                Add seat
              </button>
            )}
            {canEdit && editLayout && (
              <button
                type="button"
                onClick={handleAddRow}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline"
              >
                <Icon name="table_rows" size={18} />
                Add row
              </button>
            )}
            {canEdit && editLayout && (
              <button
                type="button"
                onClick={handleAddColumn}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline"
              >
                <Icon name="view_column" size={18} />
                Add column
              </button>
            )}
            {canEdit && editLayout && (
              <button
                type="button"
                onClick={() => store.addRoomFeature(room.id, "door")}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline"
              >
                <Icon name="sensor_door" size={18} />
                Add door
              </button>
            )}
            {canEdit && editLayout && (
              <button
                type="button"
                onClick={() => store.addRoomFeature(room.id, "window")}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline"
              >
                <Icon name="window" size={18} />
                Add window
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-[18px] flex-wrap">
          <span className="text-base font-bold text-on-surface">{room.name}</span>
          <span className="text-xs text-on-surface-variant font-medium">
            {room.floor} · each seat = 1 network port
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-3.5">
            <LegendSwatch label="Occupied" className="bg-primary-container border border-transparent" />
            <LegendSwatch label="Empty" className="bg-surface-lowest border border-outline-variant" />
          </div>
        </div>
      </div>

      {/* Canvas — light layout board with a faint graph grid + soft warm tint */}
      <div className="flex-1 min-h-0 overflow-auto relative bg-background hud-grid">
        <div className="blob w-72 h-72 -top-10 -left-10" style={{ background: "var(--accent-orange)", opacity: 0.05 }} aria-hidden />

        {/* Zoom controls */}
        <div className="absolute top-3.5 right-4 z-[3] flex flex-col gap-0.5 bg-surface border border-outline-variant rounded-md3 p-1 shadow-[var(--card-shadow)]">
          <button
            type="button"
            onClick={() => setZoomBy(0.1)}
            aria-label="Zoom in"
            className="state-layer w-[38px] h-[38px] rounded-[8px] text-on-surface flex items-center justify-center cursor-pointer"
          >
            <Icon name="add" size={22} />
          </button>
          <div className="text-center font-mono text-[10px] font-bold tabular-nums text-on-surface-variant">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => setZoomBy(-0.1)}
            aria-label="Zoom out"
            className="state-layer w-[38px] h-[38px] rounded-[8px] text-on-surface flex items-center justify-center cursor-pointer"
          >
            <Icon name="remove" size={22} />
          </button>
        </div>

        <div className="min-w-full min-h-full flex justify-center items-start px-7 pt-9 pb-16 relative">
          <div
            className="relative flex-none transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              width,
              height,
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            {/* Wall — the boundary of the room's available space. Row/column
                adds grow this box before any seat exists inside the new space. */}
            <div
              className="absolute inset-0 rounded-md3 pointer-events-none"
              style={{ border: "3px solid var(--outline)" }}
              aria-hidden
            />

            {room.features.map((feature) => (
              <RoomFeatureTile
                key={feature.id}
                feature={feature}
                editMode={editLayout}
                zoom={zoom}
                posOverride={featureDragState?.id === feature.id ? featureDragState : undefined}
                onDragMove={(posX, posY) => handleFeatureDragMove(feature.id, posX, posY)}
                onDragEnd={(posX, posY) => handleFeatureDragEnd(feature.id, posX, posY)}
                onDelete={() => store.deleteRoomFeature(room.id, feature.id)}
              />
            ))}

            {seats.map((seat) => (
              <SeatTile
                key={seat.id}
                seat={seat}
                occupant={store.occupantOf(seat)}
                group={store.groupById(seat.groupId)}
                deviceCount={store.devicesAtSeat(seat.id).length}
                selected={seat.code === selectedCode}
                editMode={editLayout}
                onSelect={() => selectSeat(seat.code)}
                zoom={zoom}
                posOverride={dragState?.id === seat.id ? dragState : undefined}
                onDragMove={(posX, posY) => handleDragMove(seat.id, posX, posY)}
                onDragEnd={(posX, posY) => handleDragEnd(seat.id, posX, posY)}
              />
            ))}
          </div>
        </div>
      </div>

      <SeatDetailPanel editMode={editLayout} />
    </div>
  );
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
      <span className={`w-3.5 h-3.5 rounded-[5px] ${className}`} />
      {label}
    </span>
  );
}
