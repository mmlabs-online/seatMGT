# syntax=docker/dockerfile:1

# --- deps: install once, reused by the build stage ---------------------------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: generate the Prisma client + Next standalone bundle --------------
# node:20-slim ships without libssl, which Prisma's query engine needs to pick
# the right binary target — without it, `prisma generate` silently defaults to
# a guess that can fail at runtime against a real database.
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime -------------------------------------------------------------------
# Ships the FULL node_modules (not just the standalone-trimmed copy) so the
# entrypoint can run `npx prisma migrate deploy` and the `tsx`-run seed script
# at container start without a separate toolchain image. Bigger image,
# simplest to get right — consistent with this project's on-prem approach.
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The standalone server otherwise binds only to the container's bridge IP,
# not loopback — breaking in-container healthchecks against localhost/127.0.0.1
# even though external access (via Docker's port mapping) works fine.
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
# The seed script runs via `tsx` (raw TypeScript, not the compiled Next
# bundle) at container start, so its `src/` imports (db client, Better Auth
# config, mock data, `@/` path alias) need to exist here too.
COPY --from=build /app/src ./src
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]
