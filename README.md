# copt-dev

Source for [copt.dev](https://copt.dev), a personal site and blog built with Next.js 16, App Router, MDX, and Prisma + PostgreSQL.

See [CLAUDE.md](CLAUDE.md) for project conventions, architecture, and agent guidelines.

## Getting Started

```bash
bun install
bun run dev
```

`dev` runs [portless](https://portless.dev) and serves the site at a named `.localhost` URL (see `portless.json`). To skip portless, use `bun run dev:next` and open <http://localhost:3000>.

## Deploying

```bash
bun run deploy
```

Pushes `main`, SSHes into the server, and runs `deploy.sh`: pull, install deps, run migrations, sync posts, blue-green build, reload PM2, and verify a 200 response. See [DEPLOY.md](DEPLOY.md) for server setup.
