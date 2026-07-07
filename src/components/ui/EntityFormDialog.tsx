"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";

/**
 * Reusable create/edit dialog shell, shaped exactly like `NewRoomDialog` so the
 * device write-UI (and the upcoming MEM-01 / AUT-03 member & account write-UIs)
 * share one modal pattern. Presentation-only: the parent owns form state,
 * submission, and validation — this just renders the scrim, card, header, the
 * supplied fields, an inline error line, and the Cancel/Submit footer.
 */
export function EntityFormDialog({
  open,
  title,
  subtitle,
  submitLabel,
  submitting = false,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
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
        className="w-full max-w-[440px] flex flex-col bg-surface-high rounded-md3-xl overflow-hidden shadow-[0_12px_40px_var(--shadow)]"
        style={{ animation: "popin .2s ease" }}
      >
        <div className="px-6 pt-[22px] pb-3.5">
          <div className="text-[20px] font-extrabold text-on-surface">{title}</div>
          {subtitle && (
            <div className="text-[13px] text-on-surface-variant font-medium mt-0.5">{subtitle}</div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 px-6 pb-2">
          {children}

          {error && <div className="text-[13px] font-semibold text-error px-1">{error}</div>}

          <div className="flex justify-end gap-2 pt-3 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="state-layer px-5 py-2.5 rounded-md3 border border-outline text-on-surface font-bold text-sm cursor-pointer font-[inherit] hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="state-layer px-5 py-2.5 rounded-md3 bg-primary text-on-primary font-bold text-sm cursor-pointer font-[inherit] disabled:opacity-40 disabled:pointer-events-none"
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Labelled text input matching the `NewRoomDialog` field styling. The wrapping
 * `<label>` implicitly associates the caption, so `getByLabel(label)` targets
 * the input in tests. */
export function DialogField({
  label,
  icon,
  ...rest
}: { label: string; icon: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-on-surface-variant px-0.5">
        {label}
      </span>
      <span className="group flex items-center gap-2.5 rounded-md3 bg-surface px-3.5 h-11 border border-outline-variant focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(251,87,41,0.15)] transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]">
        <Icon name={icon} size={18} className="text-on-surface-variant" />
        <input
          aria-label={label}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant disabled:opacity-60"
          {...rest}
        />
      </span>
    </label>
  );
}

/** Labelled select mirroring `DialogField`, for enum-ish fields (device type,
 * owner). */
export function DialogSelect({
  label,
  icon,
  children,
  ...rest
}: { label: string; icon: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-on-surface-variant px-0.5">
        {label}
      </span>
      <span className="group flex items-center gap-2.5 rounded-md3 bg-surface px-3.5 h-11 border border-outline-variant focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(251,87,41,0.15)] transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]">
        <Icon name={icon} size={18} className="text-on-surface-variant" />
        <select
          aria-label={label}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-on-surface disabled:opacity-60 cursor-pointer"
          {...rest}
        >
          {children}
        </select>
      </span>
    </label>
  );
}
