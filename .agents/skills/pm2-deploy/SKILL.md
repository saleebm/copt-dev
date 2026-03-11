---
name: pm2-deploy
description: PM2 process management and deployment for copt.dev production server. Covers SSH access (key path, nvm/PATH setup for non-interactive sessions), deploying code, managing PM2 processes, checking server status/logs, restarting the app, rolling back deployments, or troubleshooting the production environment. Use this skill whenever you need to SSH into the server, deploy, or run any remote command. Triggers on "deploy", "pm2", "server status", "production logs", "restart app", "rollback", "server health", "ssh", "server".
---

# PM2 Deploy — copt.dev

Manage deployment and PM2 process control for the copt.dev production server.

## Server Access

### Connection

```bash
# Full SSH command (always works, including from Claude Code / non-interactive shells)
ssh -i ~/.ssh/id_copt_dev_v1 deploy@172.239.45.200

# Shell aliases (only available in interactive terminal sessions)
copt                    # deploy user
copt_root               # root user (system-level changes only)
```

Always use the explicit `ssh -i` form when running commands programmatically or from Claude Code — the shell aliases are not available in non-interactive sessions.

### Non-Interactive SSH and PATH

The server's `~/.bashrc` loads nvm and bun **before** the interactivity guard, so `pm2`, `node`, and `bun` are all available in non-interactive SSH sessions. No special prefix needed:

```bash
ssh -i ~/.ssh/id_copt_dev_v1 deploy@172.239.45.200 "pm2 status"
```

### Server Details

| Property | Value |
|---|---|
| Host | `172.239.45.200` |
| User | `deploy` |
| SSH Key | `~/.ssh/id_copt_dev_v1` |
| App Dir | `/home/deploy/apps/copt-dev` |
| Logs Dir | `/home/deploy/logs/` |
| Stack | Ubuntu 24.04, Node 22 (nvm), Bun 1.3.x, PostgreSQL 16, Caddy 2.x, PM2 |

## Deploy

From the local machine:

```bash
bun run deploy
```

This runs `scripts/deploy-remote.sh`, which pushes to main, SSHes in, runs `deploy.sh`, and verifies HTTP 200.

`deploy.sh` performs these steps in order:

1. `git pull --ff-only origin main`
2. `bun install`
3. `bun run db:migrate:deploy` (Prisma migrations)
4. `bun run db:sync-posts` (sync MDX posts to DB)
5. Build to `.next-builds/<timestamp>/`, symlink `.next-builds/current`
6. `pm2 reload` (zero-downtime, rolls cluster instances one-by-one)
7. Prune old builds, keeping last 3

## PM2 Operations

All PM2 commands run on the server. They work directly in non-interactive SSH sessions — no special setup needed.

### Status & Monitoring

```bash
pm2 status                      # Process list with CPU/mem
pm2 describe copt-dev           # Full process details
pm2 monit                       # Live terminal dashboard
```

### Logs

```bash
pm2 logs copt-dev               # Stream live logs
pm2 logs copt-dev --lines 200   # Last 200 lines
pm2 flush                       # Clear all log files
```

Log files on disk:
- `/home/deploy/logs/copt-dev-out.log`
- `/home/deploy/logs/copt-dev-error.log`

### Restart / Reload

```bash
pm2 reload copt-dev             # Zero-downtime reload (preferred)
pm2 restart copt-dev            # Hard restart (brief downtime)
pm2 reload ecosystem.config.cjs --update-env  # Reload with env changes
```

### Stop / Delete

```bash
pm2 stop copt-dev               # Stop without removing
pm2 delete copt-dev             # Remove from PM2 list
```

### Scaling

The app runs in cluster mode with 2 instances (per `ecosystem.config.cjs`).

```bash
pm2 scale copt-dev +1           # Add a worker
pm2 scale copt-dev 2            # Set to exactly 2
```

### Persistence

```bash
pm2 save                        # Persist current processes across reboot
pm2 startup                     # Generate system boot script
```

## Ecosystem Config

The PM2 config lives at `ecosystem.config.cjs` in the repo root. Key settings:

- `instances: 2` — cluster mode with 2 workers
- `exec_mode: "cluster"` — enables zero-downtime reload
- `max_memory_restart: "512M"`
- `BUILD_DIR: ".next-builds/current"` — symlink to active build
- Logs to `/home/deploy/logs/`

## Rollback

To revert to a previous build:

```bash
# On the server:
cd ~/apps/copt-dev/.next-builds
ls -lt                          # List builds by date
ln -sfn <previous-timestamp> current
pm2 reload copt-dev
```

To revert code changes:

```bash
cd ~/apps/copt-dev
git log --oneline -5            # Find target commit
git checkout <commit> -- .
pm2 reload copt-dev
```

## Troubleshooting

### App not responding

```bash
pm2 status                      # Check if process is online/errored
pm2 logs copt-dev --lines 50    # Check recent errors
pm2 restart copt-dev            # Hard restart
```

### Fork-to-cluster migration

If PM2 was previously running in fork mode, delete and recreate:

```bash
pm2 delete copt-dev
pm2 start ecosystem.config.cjs
pm2 save
```

### Env var changes

When **modifying** env vars in `ecosystem.config.cjs`, use `--update-env`:

```bash
pm2 reload ecosystem.config.cjs --update-env
```

When **removing** env vars from `ecosystem.config.cjs`, `--update-env` does NOT clear cached values from PM2's process dump. You must delete and recreate:

```bash
pm2 delete copt-dev
pm2 start ecosystem.config.cjs
pm2 save
```

## Resources

For detailed PM2 command reference, see `references/api_reference.md`.
