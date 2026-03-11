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

Push to `main`, then SSH into the server and run the deploy script:

```bash
ssh deploy@<server> "cd ~/apps/copt-dev && git pull --ff-only origin main && ./deploy.sh"
```

This pulls latest `main`, installs deps, runs migrations, syncs posts, builds (blue-green via `deploy.sh`), and reloads PM2. See [DEPLOY.md](DEPLOY.md) for server setup details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
