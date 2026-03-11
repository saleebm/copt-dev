# Deployment Plan: copt.dev on Fresh Ubuntu

## Architecture

```
Internet → Nginx (443/80) → localhost:3000 (Next.js via PM2)
                                    ↓
                              PostgreSQL 16 (localhost:5432)
```

## 1. Base System + User

**Target:** Ubuntu 24.04 LTS, x86_64

```bash
# Run as root on fresh machine

# System updates
apt-get update && apt-get upgrade -y

# Create deploy user (no password login, sudo access)
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 0440 /etc/sudoers.d/deploy

# SSH hardening
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/  # your pubkey
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Disable root login + password auth
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

## 2. PostgreSQL 16

```bash
apt-get install -y postgresql-16 postgresql-client-16

systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql <<SQL
CREATE USER coptdev WITH PASSWORD '<STRONG_PASSWORD_HERE>';
CREATE DATABASE coptdev OWNER coptdev;
GRANT ALL PRIVILEGES ON DATABASE coptdev TO coptdev;
SQL
```

Lock Postgres to localhost only (default on Ubuntu, verify in `/etc/postgresql/16/main/pg_hba.conf`).

## 3. Node.js 22 + Bun

```bash
# All remaining steps as deploy user
su - deploy

# Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 22
# Produces: v22.22.1 (validated match)

# Bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
# Produces: 1.3.10 (validated match)

# PM2 (global via npm, not bun — PM2 needs node)
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
# Run the command it outputs as root
```

## 4. App Setup

```bash
# As deploy user
mkdir -p /home/deploy/apps
cd /home/deploy/apps
git clone git@github.com:saleebm/copt-dev.git copt-dev
cd copt-dev

# Install dependencies
bun install
# 824 packages (validated)

# Environment
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://coptdev:<STRONG_PASSWORD_HERE>@localhost:5432/coptdev?schema=public"
NEXT_PUBLIC_APP_URL=https://copt.dev
```

```bash
# Prisma migrations + generate
DATABASE_URL="postgresql://coptdev:<PW>@localhost:5432/coptdev?schema=public" bun run db:migrate:dev
# 8 migrations applied (validated)

# Sync MDX posts to database
DATABASE_URL="postgresql://coptdev:<PW>@localhost:5432/coptdev?schema=public" bun run db:sync-posts
# 13 posts synced (validated)

# Production build
bun run build
```

## 5. PM2 Ecosystem Config

Create `ecosystem.config.cjs` at repo root:

```js
module.exports = {
  apps: [
    {
      name: "copt-dev",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/deploy/apps/copt-dev",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://coptdev:<PW>@localhost:5432/coptdev?schema=public",
        NEXT_PUBLIC_APP_URL: "https://copt.dev",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/deploy/logs/copt-dev-error.log",
      out_file: "/home/deploy/logs/copt-dev-out.log",
      merge_logs: true,
    },
  ],
};
```

```bash
mkdir -p /home/deploy/logs
pm2 start ecosystem.config.cjs
pm2 save
```

## 6. Nginx (Latest) + SSL

```bash
# As root — install Nginx from official repo (not Ubuntu's outdated one)
curl -fsSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/ubuntu noble nginx" > /etc/apt/sources.list.d/nginx.list
apt-get update && apt-get install -y nginx

# Certbot for Let's Encrypt
apt-get install -y certbot python3-certbot-nginx

systemctl enable nginx
systemctl start nginx
```

Create `/etc/nginx/conf.d/copt-dev.conf`:

```nginx
server {
    listen 80;
    server_name copt.dev www.copt.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name copt.dev www.copt.dev;

    # SSL (certbot will fill these)
    ssl_certificate /etc/letsencrypt/live/copt.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/copt.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Remove default config
rm -f /etc/nginx/conf.d/default.conf

# Get SSL cert (DNS must point to this server first)
certbot --nginx -d copt.dev -d www.copt.dev --non-interactive --agree-tos -m <YOUR_EMAIL>

# Auto-renew
systemctl enable certbot.timer

nginx -t && systemctl reload nginx
```

## 7. Deploy Script

Create `/home/deploy/apps/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
SYNC_POSTS="${1:-no}"  # pass "sync" as arg to also sync posts

cd "$APP_DIR"

echo "==> Pulling latest code"
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun install

echo "==> Running migrations"
bun run db:migrate:deploy

echo "==> Building"
bun run build

if [ "$SYNC_POSTS" = "sync" ]; then
  echo "==> Syncing posts"
  bun run db:sync-posts
fi

echo "==> Restarting PM2"
pm2 restart copt-dev

echo "==> Done"
pm2 status
```

```bash
chmod +x /home/deploy/apps/deploy.sh
```

Usage:

```bash
# Code-only deploy
./deploy.sh

# Deploy + sync posts
./deploy.sh sync
```

## 8. Post Sync (Decoupled)

Create `/home/deploy/apps/sync-posts.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/copt-dev"
cd "$APP_DIR"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "==> Pulling latest posts"
git fetch origin main
git checkout origin/main -- posts/

echo "==> Syncing to database"
bun run db:sync-posts

echo "==> Done (no restart needed — posts served from DB)"
```

```bash
chmod +x /home/deploy/apps/sync-posts.sh
```

Can also be scheduled:

```bash
# Optional cron: sync posts every hour
crontab -e
# 0 * * * * /home/deploy/apps/sync-posts.sh >> /home/deploy/logs/sync-posts.log 2>&1
```

## Version Matrix (Validated)

| Component | Version | Source |
|---|---|---|
| Ubuntu | 24.04.4 LTS | Base image |
| Kernel | 6.1.x | Cloud provider |
| Node.js | 22.22.1 | nvm |
| Bun | 1.3.10 | bun.sh installer |
| PostgreSQL | 16.13 | apt (Ubuntu repo) |
| Nginx | latest stable | nginx.org repo |
| PM2 | latest | npm global |
| Next.js | 16.1.6 | bun.lock |
| Prisma | 7.4.2 | bun.lock |
| React | 19.3.0-canary | bun.lock |

## File Layout on Server

```
/home/deploy/
├── apps/
│   ├── copt-dev/              # git repo
│   │   ├── .env               # production env
│   │   ├── ecosystem.config.cjs
│   │   ├── .next/             # production build output
│   │   └── ...
│   ├── deploy.sh              # full deploy (optional post sync)
│   └── sync-posts.sh          # post sync only
└── logs/
    ├── copt-dev-out.log
    ├── copt-dev-error.log
    └── sync-posts.log
```

## Security Summary

| Layer | Measure |
|---|---|
| SSH | Key-only auth, root login disabled |
| Firewall | UFW: 22, 80, 443 only |
| Postgres | Localhost-only, dedicated user, strong password |
| Nginx | HTTPS forced, HSTS, security headers |
| SSL | Let's Encrypt with auto-renew |
| Process | Non-root `deploy` user, PM2 auto-restart |
| App | `.env` not in git, secrets on server only |
