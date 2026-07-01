import type { Role } from "@/types";

const ROLE_STYLES: Record<
  Role,
  { bg: string; fg: string; border: string; label: string; glow?: string }
> = {
  viewer: {
    bg: "var(--surface-container-highest)",
    fg: "var(--on-surface-variant)",
    border: "var(--outline-variant)",
    label: "Viewer",
  },
  user: {
    bg: "var(--secondary-container)",
    fg: "var(--on-secondary-container)",
    border: "color-mix(in srgb, var(--secondary) 35%, transparent)",
    label: "User",
  },
  manager: {
    bg: "var(--tertiary-container)",
    fg: "var(--on-tertiary-container)",
    border: "color-mix(in srgb, var(--tertiary) 40%, transparent)",
    label: "Manager",
  },
  admin: {
    bg: "var(--primary)",
    fg: "var(--on-primary)",
    border: "transparent",
    label: "Admin",
  },
};

/** Role tag. Uppercase, hairline-bordered; admin is the solid black chip. */
export function RoleBadge({ role, className = "" }: { role: Role; className?: string }) {
  const s = ROLE_STYLES[role];
  return (
    <span
      className={`inline-flex items-center rounded-[8px] px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] border flex-none ${className}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border, boxShadow: s.glow }}
    >
      {s.label}
    </span>
  );
}
