#!/usr/bin/env bash
set -euo pipefail

# Deploy copt.dev from local machine.
# Pushes current branch to main, then runs deploy.sh on the server via SSH.

SERVER="deploy@172.239.45.200"
SSH_KEY="$HOME/.ssh/id_copt_dev_v1"
APP_DIR="apps/copt-dev"

echo "==> Pushing to origin main"
git push origin main

echo "==> Deploying on server"
ssh -i "$SSH_KEY" "$SERVER" "cd ~/$APP_DIR && ./deploy.sh"

echo "==> Verifying"
STATUS=$(curl -sI https://copt.dev | head -1)
echo "$STATUS"

if echo "$STATUS" | grep -q "200"; then
  echo "==> Deploy successful"
else
  echo "==> WARNING: Site did not return 200"
  exit 1
fi
