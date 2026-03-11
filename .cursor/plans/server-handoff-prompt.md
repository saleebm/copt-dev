# Handoff: Server Setup for copt.dev

Paste this into Claude Code running on the server (`ssh deploy@172.239.45.200`).

---

## Prompt to paste:

You are setting up a fresh Ubuntu 25.10 (Questing Quokka) server on Linode for copt.dev. Execute the following phases in order, checking each step succeeds before proceeding. Report any errors immediately — do not skip or work around failures without asking.

**Important:** You are running as the `deploy` user. Use `sudo` for root-level commands. If the deploy user doesn't exist yet, the human operator will run Phase 1 as root first.

### What's already done (human ran as root):
- Ubuntu 25.10 is installed
- You may need to confirm: does the `deploy` user exist? Check with `whoami` and `id`.

### Phase 2: PostgreSQL 17

```bash
sudo apt-get install -y postgresql-17 postgresql-client-17
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Then create the database. The password needs to be set — ask me for the password before running this:

```bash
sudo -u postgres psql -c "CREATE USER coptdev WITH PASSWORD '<ASK_ME>';"
sudo -u postgres psql -c "CREATE DATABASE coptdev OWNER coptdev;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE coptdev TO coptdev;"
```

Verify: `sudo -u postgres psql -c "\\du"` should show coptdev user.

### Phase 3: Node.js 22 + Bun + PM2

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22
node --version  # expect v22.x

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun" && export PATH="$BUN_INSTALL/bin:$PATH"
bun --version  # expect 1.x

npm install -g pm2
```

Then run `pm2 startup systemd -u deploy --hp /home/deploy` and execute the sudo command it outputs.

### Phase 4: Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
sudo systemctl enable caddy
```

Write this Caddyfile to `/etc/caddy/Caddyfile`:

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

    handle_path /_next/static/* {
        reverse_proxy localhost:3000
        header Cache-Control "public, immutable, max-age=31536000"
    }

    encode gzip zstd
}

www.copt.dev {
    redir https://copt.dev{uri} permanent
}
```

Validate: `sudo caddy validate --config /etc/caddy/Caddyfile`
Reload: `sudo systemctl reload caddy`

Note: HTTPS won't work until DNS A records point to this server. That's fine — Caddy will retry automatically.

### Phase 5: Clone & Build App

```bash
mkdir -p /home/deploy/apps /home/deploy/logs
cd /home/deploy/apps
git clone git@github.com:saleebm/copt-dev.git copt-dev
cd copt-dev
bun install
cp .env.example .env
```

**Stop and ask me** for the DATABASE_URL password and any other env values before editing .env.

Then:

```bash
bun run db:migrate:dev
bun run db:sync-posts

mkdir -p .next-builds
DEPLOY_ID="$(date +%Y%m%d-%H%M%S)"
BUILD_DIR=".next-builds/$DEPLOY_ID" bun run build
ln -sfn "$DEPLOY_ID" .next-builds/current
```

### Phase 6: PM2 Start

```bash
pm2 start ecosystem.config.cjs
pm2 save
curl -s http://localhost:3000 | head -5
```

### Phase 7: Final Validation

Run all of these and report the output:

```bash
sudo systemctl status postgresql --no-pager
psql -U coptdev -h localhost -d coptdev -c 'SELECT count(*) FROM "Post"'
pm2 status
curl -sI http://localhost:3000 | head -5
sudo systemctl status caddy --no-pager
curl -sI https://copt.dev 2>&1 | head -10
```

### Rules:
1. Run each phase sequentially. Verify success before moving on.
2. If any command fails, show me the error and ask how to proceed.
3. Ask me for passwords/secrets — never generate them yourself.
4. After all phases, give me a summary table of what's running and versions installed.
