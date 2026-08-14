#!/bin/sh
# Docker entrypoint: ensure DB schema is in sync, then run the API.
set -e

echo "[entrypoint] applying Prisma schema to $DATABASE_URL"
# NOTE: no --accept-data-loss — destructive schema changes must be applied
# manually (e.g. `npm run db:reset` in a maintenance window), never on boot.
npx prisma db push --schema=apps/api/prisma/schema.prisma --skip-generate

# Auto-seed on first run (empty database)
USER_COUNT=$(node apps/api/prisma/check-empty.mjs)
if [ "$USER_COUNT" = "0" ]; then
  echo "[entrypoint] empty database — seeding default users/categories/menu"
  npx tsx apps/api/prisma/seed.ts || echo "[entrypoint] (seed failed, continuing)"
fi

echo "[entrypoint] starting API"
exec "$@"
