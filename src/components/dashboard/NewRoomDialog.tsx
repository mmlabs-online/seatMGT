"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/AppStore";
import { Icon } from "@/components/ui";

const initialForm = {
  code: "",
  name: "",
  description: "",
  floor: "",
  podCols: "2",
  seatCount: "8",
};

/** MD3 dialog for creating a room + its initial seat layout (Admin only). */
export function NewRoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useAppStore();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = form.code.trim();
    const name = form.name.trim();
    const floor = form.floor.trim();
    const podCols = Number(form.podCols);
    const seatCount = Number(form.seatCount);

    if (!code || !name || !floor) {
      setError("Code, name and floor are required.");
      return;
    }
    if (!Number.isInteger(podCols) || podCols < 1) {
      setError("Pod columns must be a positive whole number.");
      return;
    }
    if (!Number.isInteger(seatCount) || seatCount < 4 || seatCount % 4 !== 0) {
      setError("Seat count must be a multiple of 4 (pods are 2x2).");
      return;
    }

    setSubmitting(true);
    try {
      await store.addRoom({
        code,
        name,
        description: form.description.trim() || undefined,
        floor,
        podCols,
        seatCount,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5"
      style={{ background: "var(--scrim)", animation: "fadein .18s ease" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New room"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] flex flex-col bg-surface-high rounded-md3-xl overflow-hidden shadow-[0_12px_40px_var(--shadow)]"
        style={{ animation: "popin .2s ease" }}
      >
        <div className="px-6 pt-[22px] pb-3.5">
          <div className="text-[20px] font-extrabold text-on-surface">New room</div>
          <div className="text-[13px] text-on-surface-variant font-medium mt-0.5">
            Creates the room and lays out its seats in 2x2 pods.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room code" icon="tag" value={form.code} onChange={set("code")} placeholder="C303" />
            <Field label="Floor" icon="apartment" value={form.floor} onChange={set("floor")} placeholder="3rd Floor" />
          </div>
          <Field label="Room name" icon="meeting_room" value={form.name} onChange={set("name")} placeholder="Engineering Wing" />
          <Field
            label="Description (optional)"
            icon="notes"
            value={form.description}
            onChange={set("description")}
            placeholder="Open-plan pod, near the kitchen"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pod columns" icon="grid_view" type="number" min={1} value={form.podCols} onChange={set("podCols")} />
            <Field label="Seat count" icon="chair" type="number" min={4} step={4} value={form.seatCount} onChange={set("seatCount")} />
          </div>

          {error && (
            <div className="text-[13px] font-semibold text-error px-1">{error}</div>
          )}

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
              {submitting ? "Creating…" : "Create room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
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
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant"
          {...rest}
        />
      </span>
    </label>
  );
}
