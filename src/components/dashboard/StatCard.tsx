import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Icon } from "@/components/ui";

/** MD3 stat card — tonal icon tile, big value, label and a small badge. */
export function StatCard({
  icon,
  value,
  label,
  badge,
  iconBg = "var(--surface-container-highest)",
  iconFg = "var(--on-surface)",
  children,
}: {
  icon: string;
  value: string;
  label: string;
  badge?: string;
  iconBg?: string;
  iconFg?: string;
  /** Optional slot (e.g. an occupancy ring) rendered top-right instead of a badge. */
  children?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span
          className="w-11 h-11 rounded-md3 flex items-center justify-center border border-black/5"
          style={{ background: iconBg, color: iconFg }}
        >
          <Icon name={icon} filled size={24} />
        </span>
        {children ??
          (badge && (
            <span
              className="text-[11px] font-bold px-2.5 py-[4px] rounded-full border border-outline-variant bg-surface-container text-on-surface-variant"
            >
              {badge}
            </span>
          ))}
      </div>
      <div className="font-mono text-[34px] font-bold tracking-[-0.01em] tabular-nums mt-3.5 text-on-surface leading-none">
        {value}
      </div>
      <div className="text-[13px] font-semibold text-on-surface-variant mt-1">{label}</div>
    </Card>
  );
}
