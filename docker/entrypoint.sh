#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding (no-op if the database already has accounts)..."
npx prisma db seed

echo "Starting server..."
exec node server.js
