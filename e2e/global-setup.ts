import { execSync } from "node:child_process";

/**
 * Full reset (drop/recreate/migrate) + reseed before the E2E run, so every
 * run starts from the exact same deterministic state (3 demo logins, known
 * occupied/empty seats) regardless of what a previous manual session left
 * behind. `prisma db seed` alone won't do this anymore — it's guarded to
 * skip on a non-empty database (see prisma/seed.ts) so it's safe to run
 * against a real deploy without wiping data.
 *
 * `migrate reset` drops and recreates the database at `DATABASE_URL` (the
 * local dev DB — never point this config at anything else). Prisma's CLI
 * requires explicit human consent before an AI agent can run it; the
 * repository owner gave that consent for this exact use (resetting the
 * local dev DB before each E2E run) — see the PR/commit history. If Prisma
 * ever re-prompts (e.g. after upgrading Prisma), that consent needs to be
 * re-confirmed with whoever owns this repo before touching this line.
 */
export default function globalSetup() {
  execSync("npx prisma migrate reset --force --skip-generate", {
    stdio: "inherit",
    cwd: __dirname + "/..",
    env: {
      ...process.env,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "use real database",
    },
  });
}
