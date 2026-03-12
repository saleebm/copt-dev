# Shared Server App Deploy Guide

Canonical pattern for deploying another Next.js app to the existing shared server.

## Server Facts

| Property | Value |
|---|---|
| Host | `172.239.45.200` |
| SSH user | `deploy` |
| SSH key | `~/.ssh/id_copt_dev_v1` |
| OS | Ubuntu 25.10 |
| Runtime | Node 22 via `nvm`, Bun 1.3.x, PM2 |
| Reverse proxy | Caddy 2.x |
| Existing app | `copt.dev` on `127.0.0.1:3000` |

## Server Conventions

Every app should follow the same layout:

```text
/home/deploy/
  apps/<app-name>/            # git checkout
  data/<app-name>/            # mutable runtime data
  logs/<app-name>-out.log
  logs/<app-name>-error.log
```

Rules:

1. Give each app its own fixed localhost port.
2. Caddy owns TLS and proxies the public domain to that port.
3. PM2 runs the app from `/home/deploy/apps/<app-name>`.
4. Runtime-written files must live under `/home/deploy/data/<app-name>`, not in tracked repo paths.
5. Builds go to `.next-builds/<deploy-id>` with `.next-builds/current` symlinked to the active build.

## Repo Requirements

Each app repo should contain:

1. `next.config.*` with `distDir: process.env.BUILD_DIR || ".next"`.
2. `deploy.sh` for on-server deploy steps.
3. `scripts/deploy-remote.sh` for local push, SSH, and HTTP verification.
4. `ecosystem.config.cjs` for PM2 runtime config.
5. A tracked env template plus a local untracked `.env.production` mirror of the real server config.

## Mutable Data Rule

Do not let runtime mutations touch tracked files inside the checkout.

Bad:

```text
process.cwd()/data/content.json
process.cwd()/data/admin.db
```

Good:

```text
CONTENT_PATH=/home/deploy/data/<app-name>/content.json
AUTH_DB_PATH=/home/deploy/data/<app-name>/admin.db
```

Use repo-local defaults only for local development.

## On-Server `deploy.sh`

Required flow:

1. `git pull --ff-only origin main`
2. `bun install`
3. Run any app-specific bootstrap or migrations
4. `mkdir -p .next-builds`
5. `BUILD_DIR=".next-builds/$DEPLOY_ID" bun run build`
6. `ln -sfn "$DEPLOY_ID" .next-builds/current`
7. `pm2 reload ecosystem.config.cjs --update-env` or `pm2 start ecosystem.config.cjs`
8. Prune old builds, keeping the latest 3
9. Print `pm2 status`

Recommended shell settings:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

If the server shell is non-interactive, load `nvm` and prepend Bun to `PATH` before invoking `pm2`, `node`, or `bun`.

## Local `scripts/deploy-remote.sh`

Required flow:

1. `git push origin <branch>`
2. `ssh -i <key> deploy@<host> "cd ~/apps/<app-name> && ./deploy.sh"`
3. `curl` the public URL and require HTTP `200`

Keep these configurable by env override:

```bash
DEPLOY_APP_NAME
DEPLOY_BRANCH
DEPLOY_SERVER
DEPLOY_SSH_KEY
DEPLOY_APP_DIR
DEPLOY_VERIFY_URL
```

## PM2 Shape

Preferred baseline:

```js
module.exports = {
  apps: [
    {
      name: "<app-name>",
      script: "node_modules/next/dist/bin/next",
      args: "start -p <port> -H 127.0.0.1",
      cwd: "/home/deploy/apps/<app-name>",
      env: {
        NODE_ENV: "production",
        PORT: <port>,
        BUILD_DIR: ".next-builds/current",
      },
      exec_mode: "cluster",
      instances: 2,
      max_memory_restart: "512M",
      error_file: "/home/deploy/logs/<app-name>-error.log",
      out_file: "/home/deploy/logs/<app-name>-out.log",
      merge_logs: true,
    },
  ],
};
```

App-specific note:

- If the app uses runtime `revalidatePath` / `revalidateTag` plus filesystem-backed state or SQLite, prefer `instances: 1` until a shared cache strategy exists. Multiple instances can serve inconsistent content.

## Caddy Site Block

Add one site block per domain. Do not disturb existing blocks.

```caddyfile
example.com {
    reverse_proxy 127.0.0.1:4000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Host {host}
    }

    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }

    @static path /_next/static/*
    handle @static {
        header Cache-Control "public, immutable, max-age=31536000"
        reverse_proxy 127.0.0.1:4000
    }

    encode gzip zstd
}
```

Validate before reload:

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Validation Checklist

Before first deploy:

1. Local `bun run build`
2. Local `bun run typecheck`
3. Local `bun run lint`
4. Confirm DNS points at `172.239.45.200`

On the server:

1. `pm2 status`
2. `curl -s http://127.0.0.1:<port> | head -20`
3. `curl -sI https://<domain>`
4. Inspect app logs under `/home/deploy/logs/`
5. Re-run deploy once to confirm no data loss and no `git pull` conflicts

## Rollback

Build rollback:

```bash
cd /home/deploy/apps/<app-name>/.next-builds
ls -1dt */
ln -sfn <previous-build-id> current
pm2 reload ecosystem.config.cjs --update-env
```

Code rollback:

```bash
cd /home/deploy/apps/<app-name>
git log --oneline -5
git checkout <commit> -- .
pm2 reload ecosystem.config.cjs --update-env
```

## Env Mirror

Keep two env artifacts:

1. Tracked template: `.env.example`
2. Local untracked mirror: `.env.production`

The local `.env.production` should match the current server values for:

```text
domain URLs
public app name
deploy host/key/user
app path
port
mutable data paths
database / auth / email config
```

Do not commit secrets. Use the local mirror for reproducible future deploys.
