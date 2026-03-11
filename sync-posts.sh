#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
cd "$APP_DIR"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "==> Pulling latest posts"
git fetch origin main
git checkout origin/main -- posts/

echo "==> Syncing to database"
bun run db:sync-posts

echo "==> Done (no restart needed — posts served from DB)"
