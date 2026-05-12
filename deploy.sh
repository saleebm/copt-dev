#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
DEPLOY_ID="$(date +%Y%m%d-%H%M%S)"
BUILD_DIR=".next-builds/$DEPLOY_ID"

cd "$APP_DIR"

export BUN_INSTALL="$HOME/.bun"
export NVM_DIR="$HOME/.nvm"
# Source nvm for pm2/node access (unset -e briefly as nvm.sh can return non-zero)
set +e; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; set -e
export PATH="$BUN_INSTALL/bin:$PATH"

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
