"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/types";
import { useAppStore, initials } from "@/store/AppStore";
import { Icon, Button } from "@/components/ui";

const ROLE_CARDS: { role: Role; icon: string; blurb: string }[] = [
  { role: "viewer", icon: "visibility", blurb: "Read-only — browse rooms, seats and devices." },
  { role: "user", icon: "person", blurb: "Self-register yourself into any empty seat." },
  { role: "manager", icon: "manage_accounts", blurb: "Assign seats and move / borrow devices." },
  { role: "admin", icon: "shield_person", blurb: "Full CRUD, plus Edit Layout on the seat map." },
];

/**
 * Stubbed login. No real auth — this just sets the mock role so every RBAC
 * level can be demoed. Better Auth replaces this later.
 */
export default function LoginPage() {
  const store = useAppStore();
  const router = useRouter();
  const group = store.groupById(store.currentUser.groupId);

  const pick = (role: Role) => {
    store.setRole(role);
    router.push("/");
  };

  return (
    <div className="relative min-h-full flex items-center justify-center px-5 py-10">
      <div className="blob w-96 h-96 -top-10 -left-10" style={{ background: "var(--accent-orange)", opacity: 0.07 }} aria-hidden />
      <div className="blob w-96 h-96 bottom-0 right-0" style={{ background: "var(--accent-orange)", opacity: 0.05 }} aria-hidden />

      <div className="relative w-full max-w-[560px] bg-surface border border-outline-variant rounded-md3-xl p-8 shadow-[var(--card-shadow-hover)]">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-11 h-11 rounded-md3 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(251,87,41,0.3)]"
            style={{ background: "var(--accent-orange)" }}
          >
            <Icon name="grid_view" filled size={24} />
          </div>
          <div>
            <div className="font-heading text-[20px] font-extrabold tracking-[-0.01em] text-on-surface leading-tight">SeatMap</div>
            <div className="text-xs font-semibold text-on-surface-variant">Choose a role to explore the demo</div>
          </div>
        </div>

        <div className="flex items-center gap-3 my-6 p-3 rounded-md3 bg-surface-container">
          <span
            className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm"
            style={{ background: group?.color ?? "var(--secondary)" }}
            aria-hidden
          >
            {initials(store.currentUser.name)}
          </span>
          <div>
            <div className="text-sm font-bold text-on-surface">{store.currentUser.name}</div>
            <div className="text-xs text-on-surface-variant font-semibold">
              Signed in as demo user · current role {store.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLE_CARDS.map((c) => {
            const active = store.role === c.role;
            return (
              <button
                key={c.role}
                type="button"
                onClick={() => pick(c.role)}
                aria-pressed={active}
                className={[
                  "state-layer text-left rounded-md3-lg p-4 cursor-pointer font-[inherit] border transition-[transform,box-shadow,border-color] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)] active:scale-[0.98]",
                  active
                    ? "border-transparent bg-primary-container text-on-primary-container shadow-[0_6px_18px_rgba(251,87,41,0.28)]"
                    : "border-outline-variant bg-surface text-on-surface hover:border-outline hover:-translate-y-0.5 hover:shadow-[var(--card-shadow)]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon name={c.icon} size={22} />
                  <span className="text-[15px] font-extrabold capitalize">{c.role}</span>
                  {active && <Icon name="check_circle" filled size={18} className="ml-auto" />}
                </div>
                <p className="m-0 text-xs font-medium opacity-90">{c.blurb}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button icon="arrow_forward" onClick={() => router.push("/")}>
            Continue as {store.role}
          </Button>
        </div>
      </div>
    </div>
  );
}
