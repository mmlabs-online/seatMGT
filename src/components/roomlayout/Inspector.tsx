"use client";

import { FIXTURE_META, type Fixture, type SeatWithLayout } from "@/lib/roomLayout";
import { Icon } from "@/components/ui";

function Stepper({
  label,
  value,
  step = 1,
  min = 1,
  max = 2000,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-semibold text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="state-layer w-7 h-7 rounded-md3-sm border border-outline-variant flex items-center justify-center cursor-pointer disabled:opacity-40"
          disabled={value <= min}
        >
          <Icon name="remove" size={16} />
        </button>
        <span className="w-12 text-center font-mono text-[13px] font-bold tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="state-layer w-7 h-7 rounded-md3-sm border border-outline-variant flex items-center justify-center cursor-pointer disabled:opacity-40"
          disabled={value >= max}
        >
          <Icon name="add" size={16} />
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-on-surface-variant">{label}</span>
      <span className="text-[13px] font-bold text-on-surface text-right">{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-on-surface-variant">
      {children}
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="state-layer flex items-center justify-center gap-2 p-3 rounded-md3-lg font-bold text-[13px] cursor-pointer bg-error-container text-on-error-container active:scale-95 transition-transform"
    >
      <Icon name="delete" size={18} />
      {label}
    </button>
  );
}

export function Inspector({
  seat,
  fixture,
  multiCount = 0,
  onUpdateSeat,
  onUpdateFixture,
  onDelete,
  onClose,
}: {
  seat?: SeatWithLayout;
  fixture?: Fixture;
  multiCount?: number;
  onUpdateSeat: (patch: Partial<SeatWithLayout>) => void;
  onUpdateFixture: (patch: Partial<Fixture>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  // Multi-selection: offer a cluster delete only.
  if (!seat && !fixture) {
    if (multiCount > 1) {
      return (
        <div className="flex flex-col gap-4 p-4">
          <SectionLabel>{multiCount} selected</SectionLabel>
          <p className="text-[13px] text-on-surface-variant font-semibold m-0">
            Drag to move the cluster, or delete them together.
          </p>
          <DeleteButton label={`Delete ${multiCount} items`} onClick={onDelete} />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-4 text-on-surface-variant">
        <Icon name="ads_click" size={26} className="opacity-50" />
        <p className="text-[13px] font-semibold m-0">Select a seat or fixture to edit it.</p>
        <p className="text-[11px] font-medium m-0 opacity-80">
          Shift-click to multi-select · drag empty space to pan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>{seat ? "Seat" : FIXTURE_META[fixture!.type].label}</SectionLabel>
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selection"
          className="state-layer w-7 h-7 rounded-md3-sm border border-outline-variant flex items-center justify-center cursor-pointer"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {seat && (
        <>
          <div className="flex items-center gap-2.5 bg-surface-container rounded-md3 p-3">
            <span className="w-9 h-9 rounded-md3-sm bg-surface flex items-center justify-center flex-none border border-outline-variant">
              <Icon name="chair" size={20} className="text-on-surface-variant" />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[15px] font-bold tracking-[0.03em] text-on-surface">
                {seat.code}
              </div>
              <div className="text-[11px] font-semibold text-on-surface-variant">Port code (auto)</div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Row label="Status">
              <span className="capitalize">{seat.status}</span>
            </Row>
            <Row label="Occupant">{seat.occupantName ?? "—"}</Row>
            <Row label="Devices">{seat.deviceCount}</Row>
            <Row label="Group">
              {seat.groupName ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: seat.groupColor ?? "var(--secondary)" }}
                  />
                  {seat.groupName}
                </span>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Position">
              <span className="font-mono tabular-nums">
                {Math.round(seat.x)}, {Math.round(seat.y)}
              </span>
            </Row>
          </div>

          <div className="h-px bg-outline-variant" />

          <div className="flex flex-col gap-2.5">
            <Stepper label="Width" value={seat.w} step={8} min={40} suffix="px" onChange={(v) => onUpdateSeat({ w: v })} />
            <Stepper label="Height" value={seat.h} step={8} min={40} suffix="px" onChange={(v) => onUpdateSeat({ h: v })} />
            <Stepper
              label="Rotation"
              value={seat.rotation}
              step={15}
              min={-180}
              max={180}
              suffix="°"
              onChange={(v) => onUpdateSeat({ rotation: v })}
            />
          </div>

          <label
            className={[
              "flex items-center justify-between gap-3 rounded-md3 border p-3 cursor-pointer",
              seat.cannotSeat ? "bg-error-container/40 border-error/30" : "bg-surface-low border-outline-variant",
              seat.status === "occupied" ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-on-surface">
              <Icon name="block" size={17} />
              Cannot seat
            </span>
            <input
              type="checkbox"
              checked={seat.cannotSeat}
              disabled={seat.status === "occupied"}
              onChange={(e) => onUpdateSeat({ cannotSeat: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent-orange)] cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          <DeleteButton label="Delete seat" onClick={onDelete} />
        </>
      )}

      {fixture && (
        <>
          <div className="flex items-center gap-2.5 bg-surface-container rounded-md3 p-3">
            <span
              className="w-9 h-9 rounded-md3-sm flex items-center justify-center flex-none border border-outline-variant"
              style={{ background: fixture.color ?? FIXTURE_META[fixture.type].color }}
            >
              <Icon name={FIXTURE_META[fixture.type].icon} size={20} className="text-on-surface" />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-on-surface capitalize">
                {FIXTURE_META[fixture.type].label}
              </div>
              <div className="text-[11px] font-semibold text-on-surface-variant">Fixture</div>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-on-surface-variant">Label</span>
            <input
              type="text"
              value={fixture.label ?? ""}
              placeholder="Optional label…"
              onChange={(e) => onUpdateFixture({ label: e.target.value })}
              className="w-full bg-surface-low border border-outline-variant rounded-md3-sm px-3 py-2 text-[13px] font-semibold text-on-surface outline-none focus:border-outline font-[inherit]"
            />
          </label>

          <div className="flex flex-col gap-2.5">
            <Stepper label="Width" value={fixture.w} step={8} min={16} suffix="px" onChange={(v) => onUpdateFixture({ w: v })} />
            <Stepper label="Height" value={fixture.h} step={8} min={16} suffix="px" onChange={(v) => onUpdateFixture({ h: v })} />
            <Stepper
              label="Rotation"
              value={fixture.rotation ?? 0}
              step={15}
              min={-180}
              max={180}
              suffix="°"
              onChange={(v) => onUpdateFixture({ rotation: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-on-surface-variant">Color</span>
            <input
              type="color"
              aria-label="Fixture color"
              value={fixture.color ?? FIXTURE_META[fixture.type].color}
              onChange={(e) => onUpdateFixture({ color: e.target.value })}
              className="w-9 h-7 rounded-md3-sm border border-outline-variant bg-transparent cursor-pointer p-0"
            />
          </div>

          <Row label="Position">
            <span className="font-mono tabular-nums">
              {Math.round(fixture.x)}, {Math.round(fixture.y)}
            </span>
          </Row>

          <DeleteButton label="Delete fixture" onClick={onDelete} />
        </>
      )}
    </div>
  );
}
