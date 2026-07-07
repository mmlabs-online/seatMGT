"use client";

import type { Device } from "@/types";
import { useAppStore } from "@/store/AppStore";
import { initials } from "@/lib/format";
import { Icon } from "@/components/ui";
import { deviceIcon } from "@/lib/icons";

const COLS = "grid grid-cols-[2.2fr_1.1fr_1.4fr_1.4fr_1fr_auto] gap-3";

/**
 * MD3 device table. Horizontally scrolls on narrow screens. Read/columns are
 * unchanged; the trailing actions column only renders edit/delete for a device
 * the current user may manage (admin, or the device's own owner) — mirroring
 * the server's `assertOwnsOrAdmin`. Buttons appear only when handlers are given.
 */
export function DeviceTable({
  devices,
  onEdit,
  onDelete,
}: {
  devices: Device[];
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}) {
  const store = useAppStore();
  const canManage = (d: Device) => store.role === "admin" || d.ownerMemberId === store.currentUser.id;
  return (
    <div className="border border-outline-variant rounded-md3-lg overflow-hidden bg-surface-low shadow-[var(--card-shadow)]">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className={`${COLS} px-5 py-3.5 bg-surface-container text-[11px] font-extrabold tracking-[0.05em] uppercase text-on-surface-variant`}
          >
            <span>Device</span>
            <span>Type</span>
            <span>Owner</span>
            <span>MAC · Inventory</span>
            <span>Location</span>
            <span className="sr-only">Actions</span>
          </div>

          {devices.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] font-semibold text-on-surface-variant border-t border-outline-variant">
              No devices match this filter.
            </div>
          )}

          {devices.map((d) => {
            const owner = store.memberById(d.ownerMemberId);
            const ownerGroup = store.groupById(owner?.groupId);
            const seat = d.seatId ? store.seats.find((s) => s.id === d.seatId) : undefined;
            const placed = !!seat;
            // Status semantics: primary = online (green), borrowed/secondary =
            // warn (amber), unplaced inventory = idle (dim). Color + label always.
            const status = d.role === "primary" ? "online" : placed ? "warn" : "idle";
            return (
              <div
                key={d.id}
                className={`${COLS} px-5 py-3.5 items-center border-t border-outline-variant hover:bg-surface-container transition-colors`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className={`status-dot ${status === "idle" ? "" : status}`}
                    style={status === "idle" ? { background: "var(--outline)" } : undefined}
                    aria-hidden
                  />
                  <span className="w-[38px] h-[38px] rounded-md3-sm bg-secondary-container text-on-secondary-container border border-outline-variant flex items-center justify-center flex-none">
                    <Icon name={deviceIcon(d.type)} size={20} />
                  </span>
                  <span className="text-sm font-bold text-on-surface truncate">{d.name}</span>
                  {d.role === "primary" ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-status-online flex-none">
                      Primary
                    </span>
                  ) : placed ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-status-warn flex-none">
                      Borrowed
                    </span>
                  ) : null}
                </span>

                <span className="text-[13px] text-on-surface-variant font-semibold">{d.type}</span>

                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-[26px] h-[26px] rounded-full text-white flex items-center justify-center text-[10px] font-extrabold flex-none"
                    style={{ background: ownerGroup?.color ?? "var(--secondary)" }}
                  >
                    {owner ? initials(owner.name) : "?"}
                  </span>
                  <span className="text-[13px] font-semibold text-on-surface truncate">
                    {owner?.name ?? "—"}
                  </span>
                </span>

                <span className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs font-semibold font-mono tabular-nums text-on-surface">{d.mac}</span>
                  <span className="text-[11px] text-on-surface-variant font-mono tabular-nums">{d.inventoryNumber}</span>
                </span>

                <span
                  className="justify-self-start text-xs font-bold tracking-[0.02em] tabular-nums px-[11px] py-[5px] rounded-md3-sm border"
                  style={{
                    background: placed ? "var(--accent-orange-soft)" : "var(--surface-container-highest)",
                    color: placed ? "var(--accent-orange)" : "var(--on-surface-variant)",
                    borderColor: placed ? "rgba(251,87,41,0.25)" : "var(--outline-variant)",
                  }}
                >
                  {placed ? seat!.code : "Inventory"}
                </span>

                <span className="flex items-center gap-1 justify-end">
                  {(onEdit || onDelete) && canManage(d) ? (
                    <>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(d)}
                          aria-label={`Edit ${d.name}`}
                          title="Edit device"
                          className="state-layer w-9 h-9 rounded-md3-sm text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer flex-none"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(d)}
                          aria-label={`Delete ${d.name}`}
                          title="Delete device"
                          className="state-layer w-9 h-9 rounded-md3-sm text-on-surface-variant hover:text-status-alert flex items-center justify-center cursor-pointer flex-none"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      )}
                    </>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
