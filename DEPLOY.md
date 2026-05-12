# Deployment: copt.dev

## Current Production Shape

```text
Internet -> Caddy (80/443) -> 127.0.0.1:3000 -> PM2 cluster -> Next.js
                                             -> PostgreSQL 17 on localhost
                              PM2 fork (copt-dev-ingest) -> ingest worker -> Gemini, git, gh
```

## Current Server Stack

Ubuntu 25.10 | Node 22 via `nvm` | Bun 1.3.x | PostgreSQL 17 | Caddy 2.x | PM2

## copt.dev Files

| File | Purpose |
|---|---|
| `scripts/deploy-remote.sh` | Local push -> SSH -> `deploy.sh` -> HTTP 200 verify |
| `deploy.sh` | Remote deploy flow with install, migrate, sync, build, reload, prune |
| `ecosystem.config.cjs` | PM2 runtime config for `copt-dev` |
| `next.config.mts` | Reads `BUILD_DIR` so deploys can switch builds via symlink |

## Deploy Command

```bash
bun run deploy
```

Deploy order:

1. Push `main`
2. SSH to `/home/deploy/apps/copt-dev`
3. Run `./deploy.sh`
4. Verify `https://copt.dev` returns `200`

Remote `deploy.sh` order:

1. `git pull --ff-only origin main`
2. `bun install`
3. `bun run db:migrate:deploy`
4. `bun run db:sync-posts`
5. Build into `.next-builds/<deploy-id>`
6. Point `.next-builds/current` at the new build
7. `pm2 startOrReload ecosystem.config.cjs --update-env` (web + ingest worker)
8. `pm2 save` so processes survive reboots
9. Prune old builds, keep the latest 3

## Shared-Server Pattern

Source of truth for onboarding another app to this server: `docs/deployment/shared-server-app.md`.

Covers:

1. App directory and log conventions
2. Caddy site block shape
3. PM2 config shape
4. Mutable data handling outside the git checkout
5. Validation and rollback steps

## copt.dev Layout On Server

```text
/home/deploy/
  apps/copt-dev/
    .env
    deploy.sh
    ecosystem.config.cjs
    .next-builds/
      current -> <deploy-id>
  logs/
    copt-dev-out.log
    copt-dev-error.log
```

## Notes

1. `copt-dev` uses Caddy, not Nginx.
2. `pm2 reload` assumes the app is already in cluster mode.
3. If PM2 still has an old fork-mode process, recreate it once with `pm2 delete copt-dev && pm2 start ecosystem.config.cjs && pm2 save`.
