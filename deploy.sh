#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
SYNC_POSTS="${1:-no}"  # pass "sync" as arg to also sync posts

cd "$APP_DIR"

echo "==> Pulling latest code"
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun install

echo "==> Running migrations"
bun run db:migrate:deploy

echo "==> Building"
bun run build

if [ "$SYNC_POSTS" = "sync" ]; then
  echo "==> Syncing posts"
  bun run db:sync-posts
fi

echo "==> Restarting PM2"
pm2 restart copt-dev

echo "==> Done"
pm2 status
