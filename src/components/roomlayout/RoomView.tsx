"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/AppStore";
import { ROLE_RANK } from "@/types";
import { FIXTURE_META, type Fixture, type RoomLayoutData, type SeatWithLayout } from "@/lib/roomLayout";
import { initials, lastName } from "@/lib/format";
import { confirmAndDeleteRoom } from "@/lib/confirmDeleteRoom";
import { Icon } from "@/components/ui";
import { SeatDetailPanel } from "@/components/seatmap/SeatDetailPanel";

/**
 * PRIMARY room viewer. Read-only seat map that renders the SAME free-form
 * coordinates + fixtures the (now primary) editor writes — so what users see
 * always equals what's edited (no drift). Operational interactions (open a
 * seat, request/assign, manage devices) reuse the shared `SeatDetailPanel`,
 * driven by `?seat=CODE`. Admins get an "Arrange" action → `/rooms/[code]/edit`.
 */
export function RoomView({ layout }: { layout: RoomLayoutData }) {
  const { room, seats, fixtures } = layout;
  const store = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [zoom, setZoom] = useState(1);
  const zoomBy = (d: number) => setZoom((z) => Math.min(1.6, Math.max(0.5, +(z + d).toFixed(2))));

  const selectedCode = params.get("seat");
  const canEdit = store.rank >= ROLE_RANK.admin;
  const occupied = seats.filter((s) => s.status === "occupied").length;

  const world = { w: 800, h: 560 };
  for (const s of seats) {
    world.w = Math.max(world.w, s.x + s.w);
    world.h = Math.max(world.h, s.y + s.h);
  }
  for (const f of fixtures) {
    world.w = Math.max(world.w, f.x + f.w);
    world.h = Math.max(world.h, f.y + f.h);
  }
  world.w += 120;
  world.h += 120;

  const legend = new Map<string, string>();
  for (const s of seats) if (s.groupName) legend.set(s.groupName, s.groupColor ?? "var(--secondary)");

  const selectSeat = (code: string) => router.push(`${pathname}?seat=${code}`, { scroll: false });

  const handleDeleteRoom = async () => {
    const deleted = await confirmAndDeleteRoom(room.id, room.code);
    if (deleted) router.push("/rooms");
  };

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
              <span className="text-[15px] font-extrabold tabular-nums" style={{ color: "var(--accent-orange)" }}>
                {occupied} / {seats.length}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">occupied</span>
            </div>
            {canEdit && (
              <Link
                href={`/rooms/${room.code}/edit`}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-on-surface border-outline no-underline"
              >
                <Icon name="edit_note" size={18} />
                Arrange
              </Link>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="state-layer flex items-center gap-[7px] px-[15px] py-2 rounded-md3 font-bold text-[13px] cursor-pointer font-[inherit] border bg-transparent text-status-alert border-error/40"
              >
                <Icon name="delete" size={18} />
                Delete room
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
            <LegendSwatch label="Occupied" className="bg-primary-container border-transparent" />
            <LegendSwatch label="Empty" className="bg-surface-lowest border-outline-variant" />
            {[...legend.entries()].map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas. The scroller itself is the flex container (not a percentage-
          sized wrapper inside it) — percentage heights on a child of an
          `overflow-auto` box are unreliable, but a flex container always has
          a definite size of its own, so its direct children's `margin: auto`
          centers correctly without that indirection. `margin: auto` (not
          `justify-content`/`items-center`) on purpose: auto-margins center
          the floor plan when it's smaller than the viewport but collapse to
          0 — not negative — when it's larger, so an oversized room stays
          fully reachable by scrolling instead of having its top-left clipped
          off outside the scroll range. */}
      <div className="flex-1 min-h-0 overflow-auto relative bg-background hud-grid flex p-8">
        <div className="absolute top-3.5 right-4 z-[3] flex flex-col gap-0.5 bg-surface border border-outline-variant rounded-md3 p-1 shadow-[var(--card-shadow)]">
          <button
            type="button"
            onClick={() => zoomBy(0.1)}
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
            onClick={() => zoomBy(-0.1)}
            aria-label="Zoom out"
            className="state-layer w-[38px] h-[38px] rounded-[8px] text-on-surface flex items-center justify-center cursor-pointer"
          >
            <Icon name="remove" size={22} />
          </button>
        </div>

        <div style={{ width: world.w * zoom, height: world.h * zoom, margin: "auto" }}>
          <div
            className="relative rounded-md3 border-[3px] border-outline bg-surface-lowest"
            style={{ width: world.w, height: world.h, transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
            {fixtures.map((f) => (
              <FixtureTile key={f.id} fixture={f} />
            ))}
            {seats.map((s) => (
              <SeatViewTile
                key={s.id}
                seat={s}
                selected={s.code === selectedCode}
                onSelect={() => selectSeat(s.code)}
              />
            ))}
          </div>
        </div>
      </div>

      <SeatDetailPanel />
    </div>
  );
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
      <span className={`w-3.5 h-3.5 rounded-[5px] border ${className}`} />
      {label}
    </span>
  );
}

function SeatViewTile({
  seat,
  selected,
  onSelect,
}: {
  seat: SeatWithLayout;
  selected: boolean;
  onSelect: () => void;
}) {
  const occupied = seat.status === "occupied";
  const tint = seat.groupColor;

  let cls = "bg-surface-lowest border border-dashed border-outline text-on-surface-variant";
  const style: React.CSSProperties = {};
  if (seat.cannotSeat) {
    cls = "border border-error/40 text-status-alert";
    style.backgroundImage =
      "repeating-linear-gradient(45deg, var(--error-container) 0 6px, transparent 6px 12px)";
  } else if (occupied) {
    cls = "text-on-primary-container border";
    style.background = tint ? `color-mix(in srgb, ${tint} 20%, white)` : "var(--primary-container)";
    style.borderColor = tint ?? "transparent";
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Seat ${seat.code} — ${occupied ? `occupied by ${seat.occupantName}` : seat.cannotSeat ? "cannot seat" : "empty"}`}
      aria-pressed={selected}
      className={`absolute rounded-md3-sm p-1.5 flex flex-col justify-between text-left font-[inherit] cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)] ${cls}`}
      style={{
        left: seat.x,
        top: seat.y,
        width: seat.w,
        height: seat.h,
        transform: `rotate(${seat.rotation}deg)`,
        transformOrigin: "center",
        boxShadow: selected
          ? "0 0 0 2px var(--primary), 0 8px 20px rgba(0,0,0,0.14)"
          : occupied
            ? "0 3px 10px rgba(251,87,41,0.25)"
            : undefined,
        zIndex: selected ? 20 : 10,
        ...style,
      }}
    >
      <span className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tabular-nums opacity-80">
          {String(seat.seqNo).padStart(2, "0")}
        </span>
        {occupied && tint && <span className="w-2 h-2 rounded-full flex-none" style={{ background: tint }} />}
      </span>
      {occupied ? (
        <span
          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-extrabold self-center"
          style={{ background: tint ?? "var(--secondary)" }}
        >
          {initials(seat.occupantName ?? "?")}
        </span>
      ) : (
        <Icon name={seat.cannotSeat ? "block" : "chair"} size={20} className="opacity-40 self-center" />
      )}
      <span className="flex items-center justify-between text-[9px] font-bold">
        <span className="truncate max-w-[70%] opacity-85">
          {occupied ? lastName(seat.occupantName ?? "") : seat.cannotSeat ? "No seat" : "Empty"}
        </span>
        {seat.deviceCount > 0 && (
          <span className="flex items-center gap-0.5 opacity-85">
            <Icon name="lan" size={11} />
            {seat.deviceCount}
          </span>
        )}
      </span>
    </button>
  );
}

function FixtureTile({ fixture }: { fixture: Fixture }) {
  const meta = FIXTURE_META[fixture.type];
  const big = fixture.w > 90 && fixture.h > 90;
  return (
    <div
      className="absolute rounded-md3-sm border border-outline-variant flex flex-col items-center justify-center gap-1 text-on-surface pointer-events-none overflow-hidden"
      style={{
        left: fixture.x,
        top: fixture.y,
        width: fixture.w,
        height: fixture.h,
        background: fixture.color ?? meta.color,
        transform: `rotate(${fixture.rotation ?? 0}deg)`,
        transformOrigin: "center",
        zIndex: 5,
      }}
    >
      <Icon name={meta.icon} size={big ? 24 : 15} />
      <span className="text-[10px] font-bold truncate max-w-full px-1">{fixture.label || meta.label}</span>
    </div>
  );
}
