#!/usr/bin/env bash
set -euo pipefail

# Deploy this app from the local machine.
# Pattern: push -> SSH -> remote deploy.sh -> HTTP 200 verify.

APP_NAME="${DEPLOY_APP_NAME:-copt-dev}"
BRANCH="${DEPLOY_BRANCH:-main}"
SERVER="${DEPLOY_SERVER:-deploy@172.239.45.200}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_copt_dev_v1}"
APP_DIR="${DEPLOY_APP_DIR:-apps/copt-dev}"
VERIFY_URL="${DEPLOY_VERIFY_URL:-https://copt.dev}"

echo "==> Pushing $APP_NAME to origin/$BRANCH"
git push origin "$BRANCH"

echo "==> Running remote deploy.sh for $APP_NAME"
ssh -i "$SSH_KEY" "$SERVER" "cd ~/$APP_DIR && ./deploy.sh"

echo "==> Verifying $VERIFY_URL"
STATUS_CODE="$(curl -fsS -o /dev/null -w "%{http_code}" "$VERIFY_URL" || true)"
echo "HTTP $STATUS_CODE"

if [ "$STATUS_CODE" = "200" ]; then
  echo "==> Deploy successful"
  exit 0
fi

echo "==> Deploy failed verification"
exit 1
