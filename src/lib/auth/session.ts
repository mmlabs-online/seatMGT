import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { ROLE_RANK, type Role } from "@/types";

export interface SessionUser {
  accountId: string;
  memberId: string | null;
  role: Role;
  isActive: boolean;
}

/** Memoized per-request: reads the Better Auth session, or null if signed out. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = session.user as unknown as {
    id: string;
    role: string;
    isActive: boolean;
    memberId: string | null;
  };
  return {
    accountId: user.id,
    memberId: user.memberId ?? null,
    role: user.role.toLowerCase() as Role,
    isActive: user.isActive,
  };
});

/** Redirects to /login if there's no active, active-flagged session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    redirect("/login");
  }
  return user;
}

/** Throws if the caller's role is below `min`. Use inside every server action
 * — the store catches the throw and surfaces it to the user. */
export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[min]) {
    throw new Error("Forbidden");
  }
  return user;
}

/** Same check for page components: redirects instead of throwing, since a
 * thrown error in a Server Component renders the framework's error page
 * rather than a graceful "you can't be here." */
export async function requireRolePage(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[min]) {
    redirect("/");
  }
  return user;
}
