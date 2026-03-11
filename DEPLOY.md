# Deployment: copt.dev

## Architecture

```
Internet --> Nginx (443/80) --> localhost:3000 (Next.js via PM2)
                                       |
                                 PostgreSQL 16 (localhost:5432)
```

## Server Stack

Ubuntu 24.04 | Node 22 (nvm) | Bun 1.3.x | PostgreSQL 16 | Nginx (latest) | PM2 | Let's Encrypt SSL

## Deployment Files

| File | Location on server | Purpose |
|---|---|---|
| `ecosystem.config.cjs` | Repo root (in git) | PM2 process config -- app name, env vars, log paths, memory limits |
| `deploy.sh` | `/home/deploy/apps/deploy.sh` | Full deploy: pull, install, migrate, build, restart PM2 |
| `sync-posts.sh` | `/home/deploy/apps/sync-posts.sh` | Post-only sync: pull posts, sync to DB (no restart needed) |

## Deploy Workflow

```bash
ssh deploy@<server>

# Code deploy (pull + build + restart)
./apps/deploy.sh

# Code deploy + post sync
./apps/deploy.sh sync
```

## Post Sync Workflow

Syncs MDX posts to the database without rebuilding or restarting the app.

```bash
ssh deploy@<server>
./apps/sync-posts.sh
```

Can be scheduled via cron for automatic syncing:
```bash
# Example: sync posts every hour
0 * * * * /home/deploy/apps/sync-posts.sh >> /home/deploy/logs/sync-posts.log 2>&1
```

## Server File Layout

```
/home/deploy/
  apps/
    copt-dev/            # git repo
      .env               # production env (not in git)
      ecosystem.config.cjs
      .next/             # build output
    deploy.sh
    sync-posts.sh
  logs/
    copt-dev-out.log
    copt-dev-error.log
    sync-posts.log
```

## Reference

Full server provisioning steps (Ubuntu setup, Postgres, Node, Nginx, SSL, security hardening):
`.cursor/plans/deploy-server-setup.reference.md`
