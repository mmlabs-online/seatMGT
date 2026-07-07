import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

/**
 * Better Auth's `user` model is mapped directly onto our domain `Account`
 * model (id/email/role/isActive/memberId — see prisma/schema.prisma) so
 * there's a single identity table, not two kept in sync. Its own
 * credential-linking model is renamed to `AuthCredential` to avoid colliding
 * with our `Account`.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "Account",
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "USER" },
      isActive: { type: "boolean", required: true, defaultValue: true },
      memberId: { type: "string", required: false },
    },
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "AuthCredential",
  },
  verification: {
    modelName: "Verification",
  },
  // Must be last: applies Set-Cookie headers via next/headers when auth
  // methods are called from Server Actions / Route Handlers.
  plugins: [nextCookies()],
});
