# Deployment: copt.dev

## Architecture

```
Internet --> Nginx (443/80) --> localhost:3000 (Next.js via PM2 cluster)
                                       |
                                 PostgreSQL 16 (localhost:5432)
```

## Server Stack

Ubuntu 24.04 | Node 22 (nvm) | Bun 1.3.x | PostgreSQL 16 | Nginx (latest) | PM2 | Let's Encrypt SSL

## Deployment Files

| File | Purpose |
|---|---|
| `ecosystem.config.cjs` | PM2 cluster config (2 instances, env vars, log paths, memory limits) |
| `deploy.sh` | Full deploy: pull, install, migrate, sync posts, build, zero-downtime reload |

## Deploy Workflow

```bash
ssh deploy@<server>
cd apps/copt-dev
./deploy.sh
```

Each deploy:
1. `git pull --ff-only origin main`
2. `bun install`
3. `bun run db:migrate:deploy`
4. `bun run db:sync-posts` (marks deleted post files as unpublished)
5. Builds to `.next-builds/<timestamp>/`, symlinks `.next-builds/current`
6. `pm2 reload` rolls cluster instances one-by-one (zero downtime)
7. Prunes old builds, keeping last 3

## One-Time Migration (fork -> cluster)

If PM2 is currently running in fork mode, the first deploy must recreate the process:

```bash
pm2 delete copt-dev
pm2 start ecosystem.config.cjs
pm2 save
```

After that, `deploy.sh` uses `pm2 reload` automatically.

## Server File Layout

```
/home/deploy/
  apps/
    copt-dev/            # git repo
      .env               # production env (not in git)
      ecosystem.config.cjs
      .next-builds/
        current -> <latest>  # symlink to active build
        20260311-143000/
        20260311-120000/
      deploy.sh
  logs/
    copt-dev-out.log
    copt-dev-error.log
```

## Reference

Full server provisioning steps (Ubuntu setup, Postgres, Node, Nginx, SSL, security hardening):
`.cursor/plans/deploy-server-setup.reference.md`
