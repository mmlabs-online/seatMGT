import { config } from "dotenv";
config();

// Route the shared `src/lib/db.ts` Prisma singleton at the test database —
// tests exercise the exact same client/module the app uses, just pointed
// somewhere that's safe to wipe between runs.
if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST is not set — see .env.example.");
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

import { vi } from "vitest";
import { ROLE_RANK, type Role } from "@/types";

export interface TestSessionUser {
  accountId: string;
  memberId: string | null;
  role: Role;
  isActive: boolean;
}

let current: TestSessionUser | null = null;

/** Call from a test's `beforeEach`/inline to simulate being signed in as a
 * given role — the real Better Auth session/cookie mechanics aren't under
 * test here, only our own authorization logic built on top of them. */
export function setTestSession(user: TestSessionUser | null) {
  current = user;
}

// Global mock (applies to every test file) so `src/lib/actions/*.ts` and
// `src/lib/data/*.ts` run their REAL logic against a REAL test database,
// with only the session lookup faked.
vi.mock("@/lib/auth/session", () => {
  const unauthorized = () => {
    throw new Error("Unauthorized");
  };
  return {
    getSessionUser: async () => current,
    requireUser: async () => {
      if (!current || !current.isActive) unauthorized();
      return current;
    },
    requireRole: async (min: Role) => {
      if (!current || !current.isActive) unauthorized();
      if (ROLE_RANK[current!.role] < ROLE_RANK[min]) throw new Error("Forbidden");
      return current;
    },
    requireRolePage: async (min: Role) => {
      if (!current || !current.isActive) unauthorized();
      if (ROLE_RANK[current!.role] < ROLE_RANK[min]) throw new Error("Forbidden");
      return current;
    },
  };
});

// Server actions call `refresh()` from "next/cache" after mutating — that
// only makes sense inside a real Next.js request, so stub it out for tests.
vi.mock("next/cache", () => ({
  refresh: () => {},
  revalidatePath: () => {},
  revalidateTag: () => {},
}));
