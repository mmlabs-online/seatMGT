"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/AppStore";
import { initials } from "@/lib/format";
import { ROLE_RANK } from "@/types";
import { deviceIcon } from "@/lib/icons";
import { Icon, Avatar } from "@/components/ui";
import { PickerModal, type PickerItem } from "./PickerModal";

/**
 * URL-addressable seat detail (driven by `?seat=CODE`). Right-side drawer on
 * desktop, bottom sheet on mobile. Actions are gated by the demoed role.
 */
export function SeatDetailPanel({ editMode = false }: { editMode?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const store = useAppStore();
  const [modal, setModal] = useState<null | "member" | "device">(null);

  const code = params.get("seat");
  const seat = code ? store.seatByCode(code) : undefined;

  const close = () => {
    setModal(null);
    router.push(pathname, { scroll: false });
  };

  if (!code || !seat) return null;

  const occupant = store.occupantOf(seat);
  const occupied = !!occupant;
  const room = store.roomById(seat.roomId);
  const seatDevices = store.devicesAtSeat(seat.id);
  const primary = seatDevices.find((d) => d.role === "primary");
  const secondaries = seatDevices.filter((d) => d.role !== "primary");
  const group = store.groupById(occupant?.groupId);
  const project = store.projectById(seat.projectId);
  const pendingRequest = !occupied ? store.pendingRequestForSeat(seat.id) : undefined;
  const R = store.rank;

  // Actions gated by role (presentation-only RBAC).
  const actions: { label: string; icon: string; variant: string; onClick: () => void }[] = [];
  if (occupied) {
    if (R >= ROLE_RANK.manager) {
      actions.push({
        label: "Move / remove occupant",
        icon: "person_remove",
        variant: "bg-error-container text-on-error-container",
        onClick: () => store.removeOccupant(seat.id),
      });
      actions.push({
        label: "Add / borrow device",
        icon: "add",
        variant: "bg-transparent text-primary border border-outline",
        onClick: () => setModal("device"),
      });
    }
  } else {
    if (R >= ROLE_RANK.manager) {
      actions.push({
        label: "Assign occupant",
        icon: "person_add",
        variant: "bg-primary text-on-primary",
        onClick: () => setModal("member"),
      });
    } else if (!pendingRequest) {
      actions.push({
        label: "Request this seat",
        icon: "send",
        variant: "bg-primary text-on-primary",
        onClick: () => store.requestSeat(seat.id),
      });
    }
  }

  const readOnly = actions.length === 0 && !pendingRequest;
  const readOnlyText = "No actions available for this seat";

  const canDeleteSeat = editMode && R >= ROLE_RANK.admin;
  const seatIsRemovable = !occupied && seatDevices.length === 0;

  const handleDeleteSeat = () => {
    if (!window.confirm(`Delete seat ${seat.code}? This can't be undone.`)) return;
    store.deleteSeatAdmin(seat.id);
    close();
  };

  // Modal data
  const memberItems: PickerItem[] = store.members
    .filter((m) => m.id !== seat.occupantMemberId)
    .map((m) => {
      const g = store.groupById(m.groupId);
      const other = store.seatsOccupiedBy(m.id);
      return {
        id: m.id,
        title: m.name,
        sub: `${m.employeeCode} · ${g?.name ?? "—"}${other ? ` · ${other} seat${other > 1 ? "s" : ""}` : ""}`,
        color: g?.color ?? "var(--secondary)",
        avatar: initials(m.name),
      };
    });

  const deviceItems: PickerItem[] = store.devices
    .filter((d) => !d.seatId)
    .map((d) => {
      const owner = store.memberById(d.ownerMemberId);
      return {
        id: d.id,
        title: d.name,
        sub: `${d.type} · owner ${owner?.name ?? "—"}`,
        color: "var(--tertiary)",
        icon: deviceIcon(d.type),
      };
    });

  return (
    <>
      {/* Scrim */}
      <div
        onClick={close}
        aria-hidden
        className="fixed inset-0 z-40"
        style={{ background: "var(--scrim)", animation: "fadein .2s ease" }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Seat ${seat.code} detail`}
        className="fixed z-[41] flex flex-col bg-surface-low shadow-[-8px_0_40px_var(--shadow)]
                   left-0 right-0 bottom-0 max-h-[85vh] rounded-t-md3-xl
                   md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-[400px] md:max-h-none md:rounded-none md:border-l md:border-outline-variant
                   [animation:sheetup_.24s_cubic-bezier(0.2,0,0,1)] md:[animation:slidein_.22s_cubic-bezier(0.2,0,0,1)]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-outline-variant">
          <div
            className="w-12 h-12 rounded-md3-sm flex items-center justify-center flex-none"
            style={{
              background: occupied ? "var(--primary-container)" : "var(--surface-container-high)",
              color: occupied ? "var(--on-primary-container)" : "var(--on-surface-variant)",
            }}
          >
            <Icon name={occupied ? "event_seat" : "chair"} filled size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[22px] font-bold tracking-[0.02em] text-on-surface">
              {seat.code}
            </div>
            <div className="text-xs font-semibold text-on-surface-variant">
              {room?.name} · {occupied ? "Occupied" : "Empty"}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close seat detail"
            className="state-layer w-10 h-10 rounded-md3 bg-surface-high border border-outline-variant text-on-surface flex items-center justify-center flex-none cursor-pointer"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto px-5 pt-[18px] pb-5 flex flex-col gap-[18px]">
          {/* Occupant */}
          <section>
            <SectionLabel>Occupant</SectionLabel>
            {occupied ? (
              <div className="flex items-center gap-3 bg-primary-container text-on-primary-container rounded-md3 p-3.5">
                <Avatar name={occupant.name} color={group?.color} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold">{occupant.name}</div>
                  <div className="text-xs font-semibold opacity-85 capitalize">
                    {occupant.role} · {group?.name ?? "—"}
                  </div>
                </div>
                {(project || group) && (
                  <span
                    className="flex items-center gap-1.5 text-white text-[11px] font-bold px-2.5 py-[5px] rounded-[10px]"
                    style={{ background: project ? "var(--tertiary)" : group?.color }}
                  >
                    <Icon name={project ? "workspaces" : "sell"} size={14} />
                    {project ? project.name : group?.name}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-surface-high border-[1.5px] border-dashed border-outline rounded-md3 p-4 text-on-surface-variant">
                <Icon name="person_off" size={26} />
                <div className="text-sm font-semibold">Seat is empty · port available</div>
              </div>
            )}
            {pendingRequest && (
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-status-warn bg-status-warn/10 border border-status-warn/30 px-2.5 py-1 rounded-[7px] mt-2 w-fit">
                <span className="status-dot warn" aria-hidden />
                Request pending
              </div>
            )}
          </section>

          {/* Primary device */}
          <section>
            <SectionLabel>Primary device</SectionLabel>
            {primary ? (
              <div className="flex items-center gap-3 border border-outline-variant rounded-md3 p-[13px_14px] bg-surface-low">
                <span className="w-10 h-10 rounded-md3-sm bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <Icon name={deviceIcon(primary.type)} size={22} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-on-surface">{primary.name}</div>
                  <div className="text-[11px] text-on-surface-variant font-mono tabular-nums">
                    {primary.mac} · {primary.inventoryNumber}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-status-online bg-status-online/10 border border-status-online/30 px-2 py-1 rounded-[7px]">
                  <span className="status-dot online" aria-hidden />
                  Primary
                </span>
              </div>
            ) : (
              <div className="text-[13px] text-on-surface-variant font-semibold p-[12px_14px] border border-dashed border-outline-variant rounded-md3">
                {occupied ? "No primary device assigned." : "—"}
              </div>
            )}
          </section>

          {/* Secondary / borrowed */}
          {secondaries.length > 0 && (
            <section>
              <SectionLabel>Borrowed / secondary ({secondaries.length})</SectionLabel>
              <div className="flex flex-col gap-2">
                {secondaries.map((d) => {
                  const owner = store.memberById(d.ownerMemberId);
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 border border-outline-variant rounded-[14px] p-[11px_12px] bg-surface-low"
                    >
                      <span className="w-9 h-9 rounded-md3-sm bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                        <Icon name={deviceIcon(d.type)} size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="status-dot warn" aria-hidden />
                          <span className="text-[13px] font-bold text-on-surface">{d.name}</span>
                          <span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-status-warn">
                            Borrowed
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant font-mono tabular-nums">
                          {d.mac} · owner {owner?.name ?? "—"}
                        </div>
                      </div>
                      {R >= ROLE_RANK.manager && (
                        <button
                          type="button"
                          onClick={() => store.removeDevice(d.id)}
                          aria-label={`Return ${d.name} to inventory`}
                          title="Return to inventory"
                          className="state-layer w-[34px] h-[34px] rounded-[8px] text-on-surface-variant flex items-center justify-center flex-none cursor-pointer hover:text-status-alert"
                        >
                          <Icon name="logout" size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-col gap-2.5 mt-0.5">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className={`state-layer flex items-center justify-center gap-2 p-3.5 rounded-md3-lg font-bold text-sm cursor-pointer font-[inherit] active:scale-95 transition-transform ${a.variant}`}
                >
                  <Icon name={a.icon} size={20} />
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {readOnly && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold bg-surface-container p-[10px_14px] rounded-md3-sm">
              <Icon name="visibility" size={18} />
              {readOnlyText}
            </div>
          )}

          {canDeleteSeat && (
            <section>
              <SectionLabel>Layout designer</SectionLabel>
              {seatIsRemovable ? (
                <button
                  type="button"
                  onClick={handleDeleteSeat}
                  className="state-layer w-full flex items-center justify-center gap-2 p-3.5 rounded-md3-lg font-bold text-sm cursor-pointer font-[inherit] active:scale-95 transition-transform bg-error-container text-on-error-container"
                >
                  <Icon name="delete" size={20} />
                  Delete seat
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold bg-surface-container p-[10px_14px] rounded-md3-sm">
                  <Icon name="info" size={18} />
                  Clear the occupant and devices before deleting this seat.
                </div>
              )}
            </section>
          )}
        </div>
      </aside>

      <PickerModal
        open={modal === "member"}
        title="Assign occupant"
        subtitle={`Seat ${seat.code} · pick a member to seat here`}
        items={memberItems}
        emptyText="No members available."
        onPick={(id) => {
          store.assignOccupant(seat.id, id);
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <PickerModal
        open={modal === "device"}
        title="Add device"
        subtitle={`Place an inventory device at ${seat.code}`}
        items={deviceItems}
        onPick={(id) => {
          store.placeDevice(seat.id, id);
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-on-surface-variant mb-2">
      {children}
    </div>
  );
}
