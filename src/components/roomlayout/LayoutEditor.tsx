"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FINE_SNAP,
  FIXTURE_META,
  GRID_REF,
  PALETTE,
  SEAT_PITCH,
  newFixture,
  snap,
  type Fixture,
  type FixtureType,
  type RoomLayoutData,
  type SeatWithLayout,
} from "@/lib/roomLayout";
import { initials, lastName } from "@/lib/format";
import { addLayoutSeat, deleteLayoutSeat, saveRoomLayout } from "@/lib/actions/roomLayout";
import { Icon } from "@/components/ui";
import { Inspector } from "./Inspector";

type Kind = "seat" | "fixture";
const keyOf = (kind: Kind, id: string) => `${kind}:${id}`;

type DragState =
  | { mode: "pan"; sx: number; sy: number; ox: number; oy: number }
  | { mode: "move"; sx: number; sy: number; items: { key: string; x: number; y: number }[] }
  | { mode: "resize"; sx: number; sy: number; key: string; w: number; h: number }
  | { mode: "rotate"; key: string; cx: number; cy: number; base: number; start: number };

/**
 * Room Layout Editor v2 — FREE-FORM. Seats/fixtures sit at continuous pixel
 * coords and drag anywhere (no cell lock), with multi-select cluster move,
 * rotate/resize, zoom + pan, and an optional fine (8px) snap. Seeded from the
 * original editor's arrangement (see getRoomLayout). Occupancy is read-only.
 */
export function LayoutEditor({ initial }: { initial: RoomLayoutData }) {
  const { room } = initial;
  const [seats, setSeats] = useState<SeatWithLayout[]>(initial.seats);
  const [fixtures, setFixtures] = useState<Fixture[]>(initial.fixtures);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [snapOn, setSnapOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const moved = useRef(false);

  // Refs mirror state so the window pointer listeners always read fresh values.
  const zoomRef = useRef(zoom);
  const snapRef = useRef(snapOn);
  const panRef = useRef(pan);
  const seatsRef = useRef(seats);
  const fixturesRef = useRef(fixtures);
  const selRef = useRef(selection);
  useEffect(() => void (zoomRef.current = zoom), [zoom]);
  useEffect(() => void (snapRef.current = snapOn), [snapOn]);
  useEffect(() => void (panRef.current = pan), [pan]);
  useEffect(() => void (seatsRef.current = seats), [seats]);
  useEffect(() => void (fixturesRef.current = fixtures), [fixtures]);
  useEffect(() => void (selRef.current = selection), [selection]);

  const occupied = seats.filter((s) => s.status === "occupied").length;

  const legend = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const s of seats)
      if (s.groupId && s.groupName)
        map.set(s.groupId, { name: s.groupName, color: s.groupColor ?? "var(--secondary)" });
    return [...map.values()];
  }, [seats]);

  const world = useMemo(() => {
    let maxX = 1200;
    let maxY = 720;
    for (const s of seats) {
      maxX = Math.max(maxX, s.x + s.w);
      maxY = Math.max(maxY, s.y + s.h);
    }
    for (const f of fixtures) {
      maxX = Math.max(maxX, f.x + f.w);
      maxY = Math.max(maxY, f.y + f.h);
    }
    return { w: maxX + 400, h: maxY + 300 };
  }, [seats, fixtures]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // ---- local mutators ------------------------------------------------------
  const patchSeat = useCallback(
    (id: string, patch: Partial<SeatWithLayout>) =>
      setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [],
  );
  const patchFixture = useCallback(
    (id: string, patch: Partial<Fixture>) =>
      setFixtures((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    [],
  );

  const elByKey = (key: string) => {
    const [kind, id] = key.split(":");
    if (kind === "seat") return seatsRef.current.find((s) => s.id === id);
    return fixturesRef.current.find((f) => f.id === id);
  };

  const setPos = (key: string, x: number, y: number) => {
    const [kind, id] = key.split(":");
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (kind === "seat") patchSeat(id, { x: rx, y: ry });
    else patchFixture(id, { x: rx, y: ry });
  };
  const setSize = (key: string, w: number, h: number) => {
    const [kind, id] = key.split(":");
    if (kind === "seat") patchSeat(id, { w, h });
    else patchFixture(id, { w, h });
  };
  const setRot = (key: string, r: number) => {
    const [kind, id] = key.split(":");
    if (kind === "seat") patchSeat(id, { rotation: r });
    else patchFixture(id, { rotation: r });
  };

  // ---- pointer drag engine -------------------------------------------------
  const onWinMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pan") {
      setPan({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
      moved.current = moved.current || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 3;
      return;
    }
    const z = zoomRef.current;
    if (d.mode === "move") {
      const dx = (e.clientX - d.sx) / z;
      const dy = (e.clientY - d.sy) / z;
      for (const it of d.items) {
        let nx = it.x + dx;
        let ny = it.y + dy;
        if (snapRef.current) {
          nx = snap(nx, FINE_SNAP);
          ny = snap(ny, FINE_SNAP);
        }
        setPos(it.key, nx, ny);
      }
      moved.current = true;
    } else if (d.mode === "resize") {
      let w = d.w + (e.clientX - d.sx) / z;
      let h = d.h + (e.clientY - d.sy) / z;
      w = Math.max(24, w);
      h = Math.max(16, h);
      if (snapRef.current) {
        w = snap(w, FINE_SNAP);
        h = snap(h, FINE_SNAP);
      }
      setSize(d.key, w, h);
      moved.current = true;
    } else if (d.mode === "rotate") {
      const ang = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
      let r = d.base + (ang - d.start);
      if (snapRef.current) r = snap(r, 15);
      setRot(d.key, Math.round(r));
      moved.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Held in a ref so the "up" listener can remove itself by a stable reference
  // (a plain self-reference would be use-before-declare).
  const onWinUpRef = useRef<() => void>(() => {});
  const onWinUp = useCallback(() => {
    const d = drag.current;
    if (d) {
      if (d.mode === "pan" && !moved.current) setSelection(new Set());
      else if (d.mode !== "pan" && moved.current) setDirty(true);
    }
    drag.current = null;
    moved.current = false;
    window.removeEventListener("pointermove", onWinMove);
    window.removeEventListener("pointerup", onWinUpRef.current);
  }, [onWinMove]);
  useEffect(() => {
    onWinUpRef.current = onWinUp;
  }, [onWinUp]);

  const startDrag = (d: DragState) => {
    drag.current = d;
    moved.current = false;
    window.addEventListener("pointermove", onWinMove);
    window.addEventListener("pointerup", onWinUpRef.current);
  };

  const beginElementDrag = (e: React.PointerEvent, kind: Kind, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const key = keyOf(kind, id);
    let sel = selRef.current;
    if (e.shiftKey) {
      const n = new Set(sel);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      setSelection(n);
      sel = n;
    } else if (!sel.has(key)) {
      sel = new Set([key]);
      setSelection(sel);
    }
    const items = [...sel]
      .map((k) => {
        const el = elByKey(k);
        return el ? { key: k, x: el.x, y: el.y } : null;
      })
      .filter((v): v is { key: string; x: number; y: number } => v !== null);
    startDrag({ mode: "move", sx: e.clientX, sy: e.clientY, items });
  };

  const beginResize = (e: React.PointerEvent, kind: Kind, id: string) => {
    e.stopPropagation();
    const key = keyOf(kind, id);
    setSelection(new Set([key]));
    const el = elByKey(key);
    if (!el) return;
    startDrag({ mode: "resize", sx: e.clientX, sy: e.clientY, key, w: el.w, h: el.h });
  };

  const beginRotate = (e: React.PointerEvent, kind: Kind, id: string) => {
    e.stopPropagation();
    const key = keyOf(kind, id);
    setSelection(new Set([key]));
    const el = elByKey(key);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!el || !rect) return;
    const z = zoomRef.current;
    const cx = rect.left + panRef.current.x + (el.x + el.w / 2) * z;
    const cy = rect.top + panRef.current.y + (el.y + el.h / 2) * z;
    const start = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    startDrag({ mode: "rotate", key, cx, cy, base: el.rotation ?? 0, start });
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startDrag({ mode: "pan", sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
  };

  // ---- add / delete / save -------------------------------------------------
  const viewportCenterWorld = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const z = zoomRef.current;
    if (!rect) return { x: 120, y: 120 };
    return { x: (rect.width / 2 - pan.x) / z, y: (rect.height / 2 - pan.y) / z };
  };

  const addSeatAt = async (x: number, y: number) => {
    setBusy(true);
    try {
      const seat = await addLayoutSeat(room.id, Math.round(x), Math.round(y));
      setSeats((prev) => [...prev, seat]);
      setSelection(new Set([keyOf("seat", seat.id)]));
      return seat;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Couldn't add the seat.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addFixture = (type: FixtureType) => {
    const c = viewportCenterWorld();
    const meta = FIXTURE_META[type];
    const f = newFixture(crypto.randomUUID(), type, c.x - meta.w / 2, c.y - meta.h / 2);
    setFixtures((prev) => [...prev, f]);
    setSelection(new Set([keyOf("fixture", f.id)]));
    setDirty(true);
  };

  const addPaletteItem = (key: "seat" | FixtureType) => {
    if (key === "seat") {
      const c = viewportCenterWorld();
      void addSeatAt(c.x - 42, c.y - 42);
    } else {
      addFixture(key);
    }
  };

  /** "Add row/column" convenience — drops a short line of real seats that are
   * then freely movable (NOT locked to a grid). */
  const addLine = async (dir: "row" | "col") => {
    const c = viewportCenterWorld();
    setBusy(true);
    try {
      for (let i = 0; i < 5; i++) {
        const x = dir === "row" ? c.x + i * SEAT_PITCH - 2 * SEAT_PITCH : c.x - 42;
        const y = dir === "row" ? c.y - 42 : c.y + i * SEAT_PITCH - 2 * SEAT_PITCH;
        const seat = await addLayoutSeat(room.id, Math.round(x), Math.round(y));
        if (seat) setSeats((prev) => [...prev, seat]);
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteSelection = async () => {
    const keys = [...selRef.current];
    if (keys.length === 0) return;
    const seatIds = keys.filter((k) => k.startsWith("seat:")).map((k) => k.slice(5));
    const fxIds = keys.filter((k) => k.startsWith("fixture:")).map((k) => k.slice(8));
    if (seatIds.length && !window.confirm(`Delete ${seatIds.length} seat(s)? This can't be undone.`))
      return;

    if (fxIds.length) {
      setFixtures((prev) => prev.filter((f) => !fxIds.includes(f.id)));
      setDirty(true);
    }
    if (seatIds.length) {
      setBusy(true);
      try {
        for (const id of seatIds) {
          await deleteLayoutSeat(id);
          setSeats((prev) => prev.filter((s) => s.id !== id));
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Couldn't delete a seat.");
      } finally {
        setBusy(false);
      }
    }
    setSelection(new Set());
  };

  const save = async () => {
    setSaving(true);
    try {
      const next = await saveRoomLayout(room.id, {
        seats: seats.map((s) => ({
          id: s.id,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          w: s.w,
          h: s.h,
          cannotSeat: s.cannotSeat,
        })),
        fixtures,
      });
      setSeats(next.seats);
      setFixtures(next.fixtures);
      setDirty(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: Delete removes selection, Escape clears it.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selRef.current.size) {
          e.preventDefault();
          void deleteSelection();
        }
      } else if (e.key === "Escape") {
        setSelection(new Set());
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (d: number) => setZoom((z) => Math.min(1.8, Math.max(0.4, +(z + d).toFixed(2))));
  const single = selection.size === 1 ? [...selection][0] : null;
  const selSeat = single?.startsWith("seat:") ? seats.find((s) => keyOf("seat", s.id) === single) : undefined;
  const selFixture = single?.startsWith("fixture:")
    ? fixtures.find((f) => keyOf("fixture", f.id) === single)
    : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex-none flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline-variant bg-surface">
        <Link
          href={`/rooms/${room.code}`}
          className="state-layer flex items-center gap-1.5 px-3 py-2 rounded-md3 border border-outline-variant text-on-surface no-underline font-bold text-[13px]"
        >
          <Icon name="check" size={18} />
          Done
        </Link>
        <div className="flex flex-col leading-tight mr-1">
          <span className="text-[14px] font-extrabold text-on-surface">
            {room.name} <span className="font-mono text-on-surface-variant">· {room.code}</span>
          </span>
          <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
            Free-form layout editor
          </span>
        </div>

        {/* live occupied count */}
        <div className="flex items-center gap-1.5 bg-surface-low border border-outline-variant rounded-md3 px-3 py-1.5">
          <span className="status-dot online" aria-hidden />
          <span className="text-[14px] font-extrabold tabular-nums" style={{ color: "var(--accent-orange)" }}>
            {occupied} / {seats.length}
          </span>
          <span className="text-[11px] font-semibold text-on-surface-variant">occupied</span>
        </div>

        <div className="flex-1" />

        {/* add buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PALETTE.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => addPaletteItem(p.key)}
              title={`Add ${p.label}`}
              className="state-layer flex items-center gap-1 px-2.5 py-1.5 rounded-md3 font-bold text-[12px] cursor-pointer border bg-transparent text-on-surface border-outline"
            >
              <Icon name={p.icon} size={16} />
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void addLine("row")}
            title="Add a movable row of seats"
            className="state-layer flex items-center gap-1 px-2.5 py-1.5 rounded-md3 font-bold text-[12px] cursor-pointer border bg-transparent text-on-surface border-outline"
          >
            <Icon name="table_rows" size={16} />
            Row
          </button>
          <button
            type="button"
            onClick={() => void addLine("col")}
            title="Add a movable column of seats"
            className="state-layer flex items-center gap-1 px-2.5 py-1.5 rounded-md3 font-bold text-[12px] cursor-pointer border bg-transparent text-on-surface border-outline"
          >
            <Icon name="view_column" size={16} />
            Column
          </button>
        </div>

        {/* snap toggle */}
        <button
          type="button"
          onClick={() => setSnapOn((v) => !v)}
          aria-pressed={snapOn}
          className={[
            "state-layer flex items-center gap-1.5 px-3 py-1.5 rounded-md3 font-bold text-[12px] cursor-pointer border",
            snapOn
              ? "bg-tertiary-container text-on-tertiary-container border-transparent"
              : "bg-transparent text-on-surface border-outline",
          ].join(" ")}
        >
          <Icon name="grid_4x4" size={16} />
          Snap {snapOn ? "8px" : "off"}
        </button>

        {/* save */}
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-status-warn">
              <span className="status-dot warn" aria-hidden />
              Unsaved
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="state-layer flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[13px] cursor-pointer bg-primary text-on-primary disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
          >
            <Icon name={saving ? "progress_activity" : "save"} size={18} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Canvas */}
        <div
          ref={containerRef}
          onPointerDown={onBgPointerDown}
          className="flex-1 min-w-0 relative overflow-hidden bg-background cursor-grab"
          style={{ touchAction: "none" }}
        >
          {busy && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant bg-surface border border-outline-variant rounded-md3-sm px-2.5 py-1 shadow-[var(--card-shadow)]">
              <Icon name="progress_activity" size={14} />
              Working…
            </div>
          )}

          {/* Zoom controls (keeps the 100% readout from the original UI) */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-0.5 bg-surface border border-outline-variant rounded-md3 p-1 shadow-[var(--card-shadow)]">
            <button
              type="button"
              onClick={() => zoomBy(0.1)}
              aria-label="Zoom in"
              className="state-layer w-9 h-9 rounded-[8px] text-on-surface flex items-center justify-center cursor-pointer"
            >
              <Icon name="add" size={20} />
            </button>
            <div className="text-center font-mono text-[10px] font-bold tabular-nums text-on-surface-variant">
              {Math.round(zoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() => zoomBy(-0.1)}
              aria-label="Zoom out"
              className="state-layer w-9 h-9 rounded-[8px] text-on-surface flex items-center justify-center cursor-pointer"
            >
              <Icon name="remove" size={20} />
            </button>
          </div>

          {/* World (pan + zoom) */}
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <div
              className="relative rounded-md3 border-[3px] border-outline bg-surface-lowest"
              style={{
                width: world.w,
                height: world.h,
                backgroundImage:
                  "linear-gradient(var(--outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--outline-variant) 1px, transparent 1px)",
                backgroundSize: `${GRID_REF}px ${GRID_REF}px`,
              }}
            >
              {fixtures.map((f) => (
                <FixtureEl
                  key={f.id}
                  fixture={f}
                  selected={selection.has(keyOf("fixture", f.id))}
                  single={single === keyOf("fixture", f.id)}
                  onPointerDown={(e) => beginElementDrag(e, "fixture", f.id)}
                  onResize={(e) => beginResize(e, "fixture", f.id)}
                  onRotate={(e) => beginRotate(e, "fixture", f.id)}
                />
              ))}
              {seats.map((s) => (
                <SeatEl
                  key={s.id}
                  seat={s}
                  selected={selection.has(keyOf("seat", s.id))}
                  single={single === keyOf("seat", s.id)}
                  onPointerDown={(e) => beginElementDrag(e, "seat", s.id)}
                  onResize={(e) => beginResize(e, "seat", s.id)}
                  onRotate={(e) => beginRotate(e, "seat", s.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <aside className="flex-none w-[288px] border-l border-outline-variant bg-surface overflow-y-auto">
          <div className="p-4 border-b border-outline-variant flex items-center gap-3.5 flex-wrap">
            <LegendSwatch label="Occupied" className="bg-primary-container border-transparent" />
            <LegendSwatch label="Empty" className="bg-surface-lowest border-outline" />
            {legend.map((g) => (
              <span
                key={g.name}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                {g.name}
              </span>
            ))}
          </div>
          <Inspector
            seat={selSeat}
            fixture={selFixture}
            multiCount={selection.size}
            onUpdateSeat={(patch) => {
              if (selSeat) {
                patchSeat(selSeat.id, patch);
                setDirty(true);
              }
            }}
            onUpdateFixture={(patch) => {
              if (selFixture) {
                patchFixture(selFixture.id, patch);
                setDirty(true);
              }
            }}
            onDelete={deleteSelection}
            onClose={() => setSelection(new Set())}
          />
        </aside>
      </div>
    </div>
  );
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant">
      <span className={`w-3 h-3 rounded-[4px] border ${className}`} />
      {label}
    </span>
  );
}

/** Rotate + resize handles, shown only when a single element is selected. */
function Handles({
  onResize,
  onRotate,
}: {
  onResize: (e: React.PointerEvent) => void;
  onRotate: (e: React.PointerEvent) => void;
}) {
  return (
    <>
      <div
        aria-hidden
        title="Rotate"
        onPointerDown={onRotate}
        className="absolute left-1/2 -top-6 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-surface cursor-grab"
      />
      <div aria-hidden className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-px h-2.5 bg-primary" />
      <div
        aria-hidden
        title="Resize"
        onPointerDown={onResize}
        className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-sm bg-primary border-2 border-surface cursor-nwse-resize"
      />
    </>
  );
}

function SeatEl({
  seat,
  selected,
  single,
  onPointerDown,
  onResize,
  onRotate,
}: {
  seat: SeatWithLayout;
  selected: boolean;
  single: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResize: (e: React.PointerEvent) => void;
  onRotate: (e: React.PointerEvent) => void;
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
    <div
      onPointerDown={onPointerDown}
      className={`absolute rounded-md3-sm p-1.5 flex flex-col justify-between select-none cursor-grab active:cursor-grabbing overflow-visible ${cls}`}
      style={{
        left: seat.x,
        top: seat.y,
        width: seat.w,
        height: seat.h,
        transform: `rotate(${seat.rotation}deg)`,
        transformOrigin: "center",
        boxShadow: selected ? "0 0 0 2px var(--primary)" : occupied ? "0 3px 10px rgba(251,87,41,0.25)" : undefined,
        zIndex: selected ? 30 : 10,
        touchAction: "none",
        ...style,
      }}
    >
      <span className="flex items-center justify-between pointer-events-none">
        <span className="font-mono text-[10px] font-bold tabular-nums opacity-80">
          {String(seat.seqNo).padStart(2, "0")}
        </span>
        {occupied && tint && (
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: tint }} />
        )}
      </span>
      {occupied ? (
        <span
          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-extrabold self-center pointer-events-none"
          style={{ background: tint ?? "var(--secondary)" }}
        >
          {initials(seat.occupantName ?? "?")}
        </span>
      ) : (
        <Icon
          name={seat.cannotSeat ? "block" : "chair"}
          size={20}
          className="opacity-40 self-center pointer-events-none"
        />
      )}
      <span className="flex items-center justify-between text-[9px] font-bold pointer-events-none">
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
      {single && <Handles onResize={onResize} onRotate={onRotate} />}
    </div>
  );
}

function FixtureEl({
  fixture,
  selected,
  single,
  onPointerDown,
  onResize,
  onRotate,
}: {
  fixture: Fixture;
  selected: boolean;
  single: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResize: (e: React.PointerEvent) => void;
  onRotate: (e: React.PointerEvent) => void;
}) {
  const meta = FIXTURE_META[fixture.type];
  const big = fixture.w > 90 && fixture.h > 90;
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute rounded-md3-sm border border-outline-variant flex flex-col items-center justify-center gap-1 select-none cursor-grab active:cursor-grabbing text-on-surface overflow-visible"
      style={{
        left: fixture.x,
        top: fixture.y,
        width: fixture.w,
        height: fixture.h,
        background: fixture.color ?? meta.color,
        transform: `rotate(${fixture.rotation ?? 0}deg)`,
        transformOrigin: "center",
        boxShadow: selected ? "0 0 0 2px var(--primary)" : undefined,
        zIndex: selected ? 25 : 5,
        touchAction: "none",
      }}
    >
      <Icon name={meta.icon} size={big ? 26 : 16} className="pointer-events-none" />
      <span className="text-[11px] font-bold truncate max-w-full px-1 pointer-events-none">
        {fixture.label || meta.label}
      </span>
      {single && <Handles onResize={onResize} onRotate={onRotate} />}
    </div>
  );
}
