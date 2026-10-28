#!/usr/bin/env bash
# Runs on the server after CI uploads /srv/arth/releases/<sha>.tar.gz. Usage: release.sh <sha>
# Extract -> npm ci -> migrate -> flip symlink -> pm2 reload -> health check -> rollback on failure.
set -euo pipefail

SHA="${1:?usage: release.sh <sha>}"
ROOT=/srv/arth
REL="$ROOT/releases/$SHA"
PREV="$(readlink -f "$ROOT/current" 2>/dev/null || true)"

rollback() {
  echo "!! release failed, rolling back"
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" "$ROOT/current"
    pm2 startOrReload "$ROOT/current/deploy/ecosystem.config.js" --update-env || true
    echo "rolled back to $PREV"
  fi
  exit 1
}

rm -rf "$REL" && mkdir -p "$REL"
tar -xzf "$ROOT/releases/$SHA.tar.gz" -C "$REL"
rm -f "$ROOT/releases/$SHA.tar.gz"

trap rollback ERR

cd "$REL"
ln -sfn "$ROOT/shared/.env.api" services/api/.env
ln -sfn "$ROOT/shared/.env.web" apps/web/.env
ln -sfn "$ROOT/shared/.env.api" packages/db/.env   # prisma CLI reads DATABASE_URL from here

# Install only the workspaces that run on the server (skips the heavy Expo/mobile tree).
npm ci --workspace=packages/db --workspace=services/api --workspace=apps/web --include-workspace-root --no-audit --no-fund

# Snapshot the database before touching the schema. The automatic rollback below only restores code, so this dump
# is the way back from a bad migration (restore: pg_restore --clean --if-exists -d "$DATABASE_URL" <file>).
# A failed backup aborts the release (ERR trap) rather than migrating without a safety net.
BACKUPS="$ROOT/shared/backups"
mkdir -p "$BACKUPS"
DB_URL="$(grep -E '^DATABASE_URL=' "$ROOT/shared/.env.api" | head -1 | cut -d= -f2- | tr -d '"')"
pg_dump -Fc "$DB_URL" -f "$BACKUPS/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ)-$SHA.dump"
ls -1t "$BACKUPS"/pre-deploy-*.dump | tail -n +11 | xargs -r rm -f   # keep the 10 newest

# Apply migrations before switching traffic (migrations must stay backward compatible with the previous release).
npm run prisma:migrate:deploy

ln -sfn "$REL" "$ROOT/current"
pm2 startOrReload "$ROOT/current/deploy/ecosystem.config.js" --update-env
pm2 save

# Health checks (API incl. DB, then web)
ok=0
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/health >/dev/null && curl -fsS -o /dev/null http://127.0.0.1:3000/; then ok=1; break; fi
  sleep 2
done
[ "$ok" = 1 ] || rollback

trap - ERR
# Keep the 5 newest releases
ls -1dt "$ROOT"/releases/*/ | tail -n +6 | xargs -r rm -rf
echo "deployed $SHA"
