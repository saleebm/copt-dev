# Server Setup: copt.dev on Ubuntu 25.10 (Questing Quokka)

**Host:** Linode — `ssh -i ~/.ssh/id_copt_dev_v1 root@172.239.45.200`
**OS:** Ubuntu 25.10 "Questing Quokka" (x86_64)

## Architecture

```
Internet → Caddy (443/80, auto-HTTPS) → localhost:3000 (Next.js via PM2 cluster)
                                              ↓
                                        PostgreSQL 17 (localhost:5432)
```

## Phase 1: Base System + Deploy User

Run as **root**:

```bash
# System updates
apt-get update && apt-get upgrade -y

# Create deploy user (no password login, sudo access)
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 0440 /etc/sudoers.d/deploy

# SSH: copy your pubkey to deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# SSH hardening
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Build essentials
apt-get install -y curl wget git build-essential
```

**Checkpoint:** SSH in as deploy user to verify before disabling root.

## Phase 2: PostgreSQL 17

Ubuntu 25.10 ships PostgreSQL 17 in its default repos.

```bash
# As root
apt-get install -y postgresql-17 postgresql-client-17

systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql <<SQL
CREATE USER coptdev WITH PASSWORD '<STRONG_PASSWORD_HERE>';
CREATE DATABASE coptdev OWNER coptdev;
GRANT ALL PRIVILEGES ON DATABASE coptdev TO coptdev;
SQL
```

Verify localhost-only binding in `/etc/postgresql/17/main/pg_hba.conf`.

## Phase 3: Node.js 22 + Bun

All remaining steps as **deploy** user (`su - deploy`):

```bash
# Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 22

# Bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# PM2 (global via npm — PM2 needs node)
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
# ↑ Run the command it outputs as root
```

## Phase 4: Caddy

Back as **root**:

```bash
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list

chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod o+r /etc/apt/sources.list.d/caddy-stable.list

apt-get update
apt-get install -y caddy

systemctl enable caddy
```

### Caddyfile

Write to `/etc/caddy/Caddyfile`:

```caddyfile
copt.dev {
    reverse_proxy localhost:3000 {
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
        reverse_proxy localhost:3000
    }

    encode gzip zstd
}

www.copt.dev {
    redir https://copt.dev{uri} permanent
}
```

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy automatically provisions and renews Let's Encrypt TLS certificates. No certbot needed.

**DNS prerequisite:** `copt.dev` and `www.copt.dev` A records must point to `172.239.45.200` before Caddy can obtain certificates.

## Phase 5: App Setup

As **deploy** user:

```bash
mkdir -p /home/deploy/apps /home/deploy/logs
cd /home/deploy/apps
git clone git@github.com:saleebm/copt-dev.git copt-dev
cd copt-dev

bun install

cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://coptdev:<STRONG_PASSWORD_HERE>@localhost:5432/coptdev?schema=public"
NEXT_PUBLIC_APP_URL=https://copt.dev
```

```bash
# Prisma migrations
bun run db:migrate:dev

# Sync MDX posts to database
bun run db:sync-posts

# First production build (blue-green)
mkdir -p .next-builds
DEPLOY_ID="$(date +%Y%m%d-%H%M%S)"
BUILD_DIR=".next-builds/$DEPLOY_ID" bun run build
ln -sfn "$DEPLOY_ID" .next-builds/current
```

## Phase 6: PM2 Start

The `ecosystem.config.cjs` is already in the repo:

```bash
cd /home/deploy/apps/copt-dev
mkdir -p /home/deploy/logs
pm2 start ecosystem.config.cjs
pm2 save
```

Verify: `curl -s http://localhost:3000 | head -20` should return HTML.

## Phase 7: Claude Code on the Server

As **deploy** user:

```bash
# Install Claude Code (native installer, no Node dependency)
curl -fsSL https://claude.ai/install.sh | bash

# Open new shell to pick up PATH, then authenticate via OAuth
claude
# Follow the browser OAuth flow in the terminal
```

After auth, Claude Code is ready to operate on the server.

## Deploy Script

The `deploy.sh` in the repo root handles blue-green deploys:

```bash
chmod +x /home/deploy/apps/copt-dev/deploy.sh
```

Usage:

```bash
cd /home/deploy/apps/copt-dev
./deploy.sh
```

This pulls latest, installs deps, runs migrations, syncs posts, builds to a timestamped `.next-builds/` dir, symlinks `current`, and reloads PM2. Keeps last 3 builds.

## Validation Checklist

After setup, verify each layer:

| Check | Command |
|---|---|
| PostgreSQL running | `sudo systemctl status postgresql` |
| DB accessible | `psql -U coptdev -h localhost -d coptdev -c 'SELECT 1'` |
| Next.js responding | `curl -s http://localhost:3000` |
| PM2 healthy | `pm2 status` |
| Caddy serving HTTPS | `curl -sI https://copt.dev` |
| www redirect | `curl -sI https://www.copt.dev` (expect 301) |
| Security headers | `curl -sI https://copt.dev \| grep -E 'Strict\|X-Frame\|X-Content'` |
| Claude Code | `claude --version` |

## Version Matrix

| Component | Version | Source |
|---|---|---|
| Ubuntu | 25.10 (Questing Quokka) | Linode image |
| Node.js | 22.x | nvm |
| Bun | latest | bun.sh installer |
| PostgreSQL | 17.x | Ubuntu 25.10 default repo |
| Caddy | latest stable | Cloudsmith APT repo |
| PM2 | latest | npm global |
| Next.js | 16.1.6 | bun.lock |
| Prisma | 7.4.2 | bun.lock |

## File Layout on Server

```
/home/deploy/
├── apps/
│   ├── copt-dev/                # git repo
│   │   ├── .env                 # production env (not in git)
│   │   ├── ecosystem.config.cjs # PM2 config (in git)
│   │   ├── deploy.sh            # blue-green deploy script (in git)
│   │   ├── .next-builds/        # timestamped builds
│   │   │   ├── 20260311-143000/ # build artifacts
│   │   │   └── current -> 20260311-143000
│   │   └── ...
│   └── sync-posts.sh            # post sync only
└── logs/
    ├── copt-dev-out.log
    ├── copt-dev-error.log
    └── sync-posts.log

/etc/caddy/Caddyfile             # Caddy config
```

## Security Summary

| Layer | Measure |
|---|---|
| SSH | Key-only auth, root login disabled |
| Firewall | UFW: 22, 80, 443 only |
| Postgres | Localhost-only, dedicated user, strong password |
| Caddy | Auto-HTTPS (Let's Encrypt), HSTS, security headers, Server header stripped |
| Process | Non-root `deploy` user, PM2 auto-restart, cluster mode |
| App | `.env` not in git, secrets on server only |

## Caddy vs Nginx (why the switch)

- **Automatic HTTPS** — no certbot, no cron, no manual cert management
- **Simpler config** — ~25 lines vs ~45 lines of nginx config
- **Auto-renewal** — built-in ACME client handles cert rotation
- **HTTP/2 + HTTP/3** — enabled by default, no extra config
- **Memory-safe** — written in Go, no buffer overflow class of bugs
