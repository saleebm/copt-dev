# copt-dev

Personal website/blog built with Next.js 16, App Router, MDX, Prisma + PostgreSQL.

See [CLAUDE.md](CLAUDE.md) for full project conventions, architecture, and agent guidelines.

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Deploying

```bash
bun run deploy
```

Pushes `main`, SSHes into the server, runs `deploy.sh` (pull, deps, migrations, sync posts, blue-green build, PM2 reload), and verifies HTTP 200. See [DEPLOY.md](DEPLOY.md) for server setup details.
