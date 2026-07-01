"use client";

import type { Role } from "@/types";
import { useAppStore } from "@/store/AppStore";
import { Icon } from "@/components/ui";

const ROLES: { value: Role; label: string; icon: string }[] = [
  { value: "viewer", label: "Viewer", icon: "visibility" },
  { value: "user", label: "User", icon: "person" },
  { value: "manager", label: "Manager", icon: "manage_accounts" },
  { value: "admin", label: "Admin", icon: "shield_person" },
];

/**
 * Dev-only role switcher (presentation RBAC). Sets the mock current role so all
 * four roles can be demoed. Real enforcement arrives later with Better Auth.
 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { role, setRole } = useAppStore();
  return (
    <div
      role="radiogroup"
      aria-label="Demo role"
      className="flex items-center gap-0.5 rounded-full bg-surface-high border border-outline-variant p-[3px]"
    >
      {ROLES.map((r) => {
        const active = role === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${r.label} role`}
            onClick={() => setRole(r.value)}
            className={[
              "state-layer inline-flex items-center gap-1.5 rounded-full cursor-pointer font-bold text-xs font-[inherit]",
              compact ? "px-2.5 py-1.5" : "px-3 py-[7px]",
              "transition-colors duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
              active
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            <Icon name={r.icon} size={16} />
            <span className={compact ? "hidden lg:inline" : "hidden sm:inline"}>
              {r.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
