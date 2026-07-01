"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui";

export interface PickerItem {
  id: string;
  title: string;
  sub: string;
  color: string;
  /** Either a Material Symbol name (icon) or short avatar text (initials). */
  icon?: string;
  avatar?: string;
}

/**
 * MD3 dialog for picking a member or an inventory device. Scrim + pop-in,
 * closes on Escape / backdrop click.
 */
export function PickerModal({
  open,
  title,
  subtitle,
  items,
  emptyText = "Nothing available in inventory.",
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  items: PickerItem[];
  emptyText?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5"
      style={{ background: "var(--scrim)", animation: "fadein .18s ease" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[74vh] flex flex-col bg-surface-high rounded-md3-xl overflow-hidden shadow-[0_12px_40px_var(--shadow)]"
        style={{ animation: "popin .2s ease" }}
      >
        <div className="px-6 pt-[22px] pb-3.5">
          <div className="text-[20px] font-extrabold text-on-surface">{title}</div>
          <div className="text-[13px] text-on-surface-variant font-medium mt-0.5">
            {subtitle}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-3 pb-2 flex flex-col gap-1">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-on-surface-variant font-semibold">
              {emptyText}
            </div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onPick(it.id)}
                className="state-layer flex items-center gap-3 p-3 rounded-md3 bg-transparent cursor-pointer text-left font-[inherit] text-on-surface"
              >
                <span
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center text-[13px] font-extrabold flex-none"
                  style={{ background: it.color }}
                >
                  {it.icon ? <Icon name={it.icon} size={20} /> : it.avatar}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold">{it.title}</span>
                  <span className="block text-xs text-on-surface-variant font-medium">
                    {it.sub}
                  </span>
                </span>
                <Icon name="add" size={20} className="text-on-surface-variant" />
              </button>
            ))
          )}
        </div>

        <div className="px-5 py-4 flex justify-end border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="state-layer px-5 py-2.5 rounded-md3 border border-outline text-on-surface font-bold text-sm cursor-pointer font-[inherit] hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
