"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/AppStore";
import { initials } from "@/lib/format";
import { authClient } from "@/lib/auth/client";
import { ROLE_RANK } from "@/types";
import { Icon, IconButton, RoleBadge } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
  minRank?: number;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "space_dashboard", match: (p) => p === "/" },
  { href: "/rooms", label: "Rooms", icon: "grid_view", match: (p) => p.startsWith("/rooms") },
  { href: "/devices", label: "Devices", icon: "lan", match: (p) => p.startsWith("/devices") },
  { href: "/members", label: "Members", icon: "group", match: (p) => p.startsWith("/members") },
  {
    href: "/approvals",
    label: "Approvals",
    icon: "fact_check",
    match: (p) => p.startsWith("/approvals"),
    minRank: ROLE_RANK.manager,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { rooms, currentUser, role, rank, theme, toggleTheme, groupById } = useAppStore();
  const group = groupById(currentUser.groupId);
  const navItems = NAV.filter((item) => item.minRank === undefined || rank >= item.minRank);

  const logout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  // Derive a "current" room for the switcher: whichever room the URL is on, else the first.
  const activeRoomCode =
    rooms.find((r) => pathname === `/rooms/${r.code}`)?.code ?? rooms[0]?.code;

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-full overflow-hidden text-on-surface">
      {/* Nav rail (desktop) / bottom bar (mobile) — white side panel */}
      <nav
        aria-label="Primary"
        className="flex-none flex md:flex-col items-center justify-around md:justify-start
                   md:w-[88px] md:py-3.5 md:gap-2 h-[68px] md:h-auto
                   bg-surface border-t md:border-t-0 md:border-r border-outline-variant z-10"
      >
        <div className="hidden md:flex mb-3.5">
          <div
            className="w-10 h-10 rounded-md3 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(251,87,41,0.3)]"
            style={{ background: "var(--accent-orange)" }}
          >
            <Icon name="grid_view" filled size={24} />
          </div>
        </div>
        <div className="flex md:flex-col gap-1.5 w-full justify-around md:justify-start">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="state-layer flex flex-col items-center gap-1 md:w-16 px-1 py-1.5 rounded-md3
                           no-underline text-on-surface-variant aria-[current=page]:text-on-surface"
              >
                <span
                  className={[
                    "w-14 h-8 rounded-md3 flex items-center justify-center transition-colors duration-150",
                    active
                      ? "bg-secondary-container text-on-secondary-container border border-outline-variant"
                      : "",
                  ].join(" ")}
                >
                  <Icon name={item.icon} filled={active} size={22} />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.02em]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-16 flex-none flex items-center gap-3 px-4 md:px-5 bg-surface border-b border-outline-variant z-[5]">
          <div className="flex flex-col leading-[1.15] min-w-0">
            <span className="font-heading text-[18px] font-extrabold tracking-[-0.01em] text-on-surface whitespace-nowrap">
              SeatMap
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant whitespace-nowrap uppercase tracking-[0.06em]">
              Northgate Campus · Bldg C
            </span>
          </div>

          <div className="flex-1" />

          {/* Room switcher */}
          {activeRoomCode && (
            <label className="hidden sm:flex items-center gap-2 bg-surface-high border border-outline-variant rounded-md3 pl-3 pr-1.5 h-10">
              <Icon name="meeting_room" size={18} className="text-on-surface-variant" />
              <span className="sr-only">Switch room</span>
              <select
                value={pathname.startsWith("/rooms/") ? activeRoomCode : ""}
                onChange={(e) => router.push(`/rooms/${e.target.value}`)}
                className="bg-transparent outline-none font-mono text-[13px] font-bold text-on-surface pr-1 h-full cursor-pointer"
                aria-label="Switch room"
              >
                <option value="" disabled>
                  Go to room…
                </option>
                {rooms.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} · {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <IconButton
            icon={theme === "light" ? "dark_mode" : "light_mode"}
            label="Toggle theme"
            onClick={toggleTheme}
          />

          <IconButton icon="logout" label="Log out" onClick={logout} />

          <div className="flex items-center gap-2 flex-none">
            <span
              title={`${currentUser.name} — you`}
              className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-sm border-2 border-surface"
              style={group ? { background: group.color, color: "#fff" } : undefined}
              aria-hidden
            >
              {initials(currentUser.name)}
            </span>
            <RoleBadge role={role} className="hidden md:inline-flex" />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto relative">{children}</main>
      </div>
    </div>
  );
}
