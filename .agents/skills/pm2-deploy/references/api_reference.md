# PM2 Command Reference

## Process Management

```bash
pm2 start ecosystem.config.cjs       # Start app from config
pm2 stop copt-dev                     # Stop process
pm2 restart copt-dev                  # Hard restart (brief downtime)
pm2 reload copt-dev                   # Zero-downtime reload (cluster mode)
pm2 delete copt-dev                   # Remove from PM2 process list
pm2 reload ecosystem.config.cjs --update-env  # Reload with updated env vars
```

## Monitoring

```bash
pm2 status                            # List all processes with status
pm2 list                              # Same as status
pm2 describe copt-dev                 # Full info on process (env, paths, restarts)
pm2 monit                             # Terminal dashboard (CPU, mem, logs)
pm2 logs                              # Stream all logs
pm2 logs copt-dev                     # Stream app-specific logs
pm2 logs copt-dev --lines 200         # Show last 200 lines
pm2 flush                             # Empty all log files
```

## Cluster Mode

```bash
pm2 start ecosystem.config.cjs        # Starts N instances per config
pm2 scale copt-dev +1                  # Add 1 worker
pm2 scale copt-dev 2                   # Set to exactly 2 workers
```

## Persistence

```bash
pm2 save                              # Save current process list (survives reboot)
pm2 startup                           # Generate system startup script
pm2 unstartup                         # Remove startup script
pm2 resurrect                         # Restore saved process list
```

## Deployment System

```bash
pm2 deploy production setup           # Provision remote server
pm2 deploy production                 # Deploy latest
pm2 deploy production revert 1        # Rollback to previous deployment
pm2 deploy production exec "cmd"      # Run command on remote
pm2 deploy production list            # List previous deploy commits
pm2 deploy production current         # Show current release commit
```

### Deployment Lifecycle Hooks

Hooks in ecosystem config `deploy` block:

| Hook | When | Runs on |
|---|---|---|
| `pre-setup` | Before setup | Remote |
| `post-setup` | After cloning repo | Remote |
| `pre-deploy-local` | Before deploy | Local |
| `pre-deploy` | Before deploy | Remote |
| `post-deploy` | After deploy | Remote |

### Deploy Config Structure

```javascript
module.exports = {
  apps: [{ /* ... */ }],
  deploy: {
    production: {
      key: "/path/to/key.pem",
      user: "deploy",
      host: "192.168.0.1",
      ref: "origin/main",
      repo: "git@github.com:user/repo.git",
      path: "/var/www/app",
      "post-deploy": "bun install && bun run build && pm2 reload ecosystem.config.cjs --update-env"
    }
  }
};
```

## Misc

```bash
pm2 update                            # Update in-memory PM2
pm2 ping                              # Check PM2 daemon is running
pm2 reset copt-dev                    # Reset restart count / metadata
pm2 sendSignal SIGUSR2 copt-dev       # Send signal to process
```
