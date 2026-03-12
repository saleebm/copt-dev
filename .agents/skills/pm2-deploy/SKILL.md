---
name: pm2-deploy
description: PM2 process management and deployment for copt.dev production server. Covers SSH access (key path, nvm/PATH setup for non-interactive sessions), deploying code, managing PM2 processes, checking server status/logs, restarting the app, rolling back deployments, or troubleshooting the production environment. Use this skill whenever you need to SSH into the server, deploy, or run any remote command. Triggers on "deploy", "pm2", "server status", "production logs", "restart app", "rollback", "server health", "ssh", "server".
---

# PM2 Deploy — copt.dev

App-specific deployment and PM2 operations for `copt.dev`. For shared server conventions, SSH access, directory layout, Caddy patterns, deploy flow shape, rollback procedures, and onboarding new apps, see the global skill: `~/.agents/skills/copt-shared-server/SKILL.md`.

## App Details

| Property | Value |
|---|---|
| App name | `copt-dev` |
| Domain | `copt.dev` |
| Port | `3000` |
| App dir | `/home/deploy/apps/copt-dev` |
| Logs | `/home/deploy/logs/copt-dev-{out,error}.log` |
| PM2 instances | `2` (cluster mode) |
| Database | PostgreSQL 17 (local) |

## Deploy

```bash
bun run deploy
```

Runs `scripts/deploy-remote.sh` which pushes to main, SSHes in, runs `deploy.sh`, and verifies HTTP 200.

Remote `deploy.sh` steps:

1. `git pull --ff-only origin main`
2. `bun install`
3. `bun run db:migrate:deploy` (Prisma migrations)
4. `bun run db:sync-posts` (sync MDX posts to DB)
5. Build to `.next-builds/<timestamp>/`, symlink `.next-builds/current`
6. `pm2 reload` (zero-downtime cluster reload)
7. Prune old builds, keeping last 3

## PM2 Quick Ref

```bash
pm2 status
pm2 describe copt-dev
pm2 logs copt-dev --lines 200
pm2 reload copt-dev                     # zero-downtime
pm2 restart copt-dev                    # hard restart
pm2 reload ecosystem.config.cjs --update-env
pm2 scale copt-dev 2
pm2 save
```

## Ecosystem Config

Key settings in `ecosystem.config.cjs`:

- `instances: 2` — cluster mode, zero-downtime reload
- `exec_mode: "cluster"`
- `max_memory_restart: "512M"`
- `BUILD_DIR: ".next-builds/current"`

## Rollback

Build rollback:

```bash
cd ~/apps/copt-dev/.next-builds
ls -lt
ln -sfn <previous-timestamp> current
pm2 reload copt-dev
```

Code rollback:

```bash
cd ~/apps/copt-dev
git log --oneline -5
git checkout <commit> -- .
pm2 reload copt-dev
```

## Troubleshooting

### App not responding

```bash
pm2 status
pm2 logs copt-dev --lines 50
pm2 restart copt-dev
```

### Fork-to-cluster migration

```bash
pm2 delete copt-dev
pm2 start ecosystem.config.cjs
pm2 save
```

### Env var changes

Adding/changing: `pm2 reload ecosystem.config.cjs --update-env`

Removing: delete and recreate (see global skill `server-conventions.md` for details).

## Canonical Docs

1. `docs/deployment/shared-server-app.md`
2. `deploy.sh`
3. `ecosystem.config.cjs`
4. `scripts/deploy-remote.sh`

## Resources

For PM2 command reference, see `references/api_reference.md`.
