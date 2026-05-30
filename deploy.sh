#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
LOCK_FILE="${DEPLOY_LOCK_FILE:-$APP_DIR/.deploy.lock}"
LOG_DIR="${DEPLOY_LOG_DIR:-/home/deploy/logs}"
DEPLOY_ID="${NEXT_DEPLOYMENT_ID:-$(date +%Y%m%d-%H%M%S)}"
BUILD_DIR=".next-builds/$DEPLOY_ID"
LOG_FILE="$LOG_DIR/copt-dev-deploy-$DEPLOY_ID.log"
TRIGGERED_BY="${DEPLOY_TRIGGERED_BY:-cli}"

mkdir -p "$LOG_DIR"

# Re-enter under flock so concurrent deploys serialize instead of racing each
# other (PR floods from the iOS Shortcut, /api/review/deploy retries, etc.).
# flock holds an advisory lock on the .deploy.lock file until this process
# exits. -n means: fail fast if another deploy already holds the lock.
if [ -z "${DEPLOY_LOCK_HELD:-}" ]; then
  exec env DEPLOY_LOCK_HELD=1 flock -n "$LOCK_FILE" -c "bash '$0' $*"
fi

# Also tee everything below into a per-run log so /api/review/deploy/[runId]
# can stream it back, and so the same log survives `pm2 startOrReload`
# (which kills the parent Next.js worker mid-deploy).
exec > >(tee -a "$LOG_FILE") 2>&1

echo "==> deploy-id    $DEPLOY_ID"
echo "==> triggered-by $TRIGGERED_BY"
echo "==> log          $LOG_FILE"
echo "==> startedAt    $(date -u +%FT%TZ)"

cd "$APP_DIR"

export BUN_INSTALL="$HOME/.bun"
export NVM_DIR="$HOME/.nvm"
# Source nvm for pm2/node access (unset -e briefly as nvm.sh can return non-zero)
set +e; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; set -e
export PATH="$BUN_INSTALL/bin:$PATH"

# Load .env so the build sees NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (and anything
# else the build needs baked in). Required so all cluster workers across
# deploys share the same Server Actions encryption key — otherwise mid-deploy
# tabs hit "Failed to find Server Action".
if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env"
  set +a
fi

# Expose DEPLOY_ID to Next.js for version-skew protection (deploymentId).
export NEXT_DEPLOYMENT_ID="$DEPLOY_ID"

echo "==> Pulling latest code"
git pull --ff-only origin main

echo "==> Installing dependencies"
bun install

echo "==> Running migrations"
bun run db:migrate:deploy

echo "==> Syncing posts"
bun run db:sync-posts

echo "==> Building (deploy: $DEPLOY_ID)"
mkdir -p .next-builds
BUILD_DIR="$BUILD_DIR" bun run build

echo "==> Switching build"
ln -sfn "$DEPLOY_ID" .next-builds/current

echo "==> Reloading PM2"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> Cleaning old builds (keeping last 3)"
cd .next-builds
# shellcheck disable=SC2010
ls -1dt */ 2>/dev/null | grep -v '^current' | tail -n +4 | xargs -r rm -rf
cd "$APP_DIR"

echo "==> Done"
pm2 status

echo "==> finishedAt $(date -u +%FT%TZ)"
