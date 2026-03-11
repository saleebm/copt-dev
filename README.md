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

Push to `main` then run the deploy script on the server:

```bash
ssh deploy@172.239.45.200
cd /home/deploy/apps/copt-dev
./deploy.sh
```

The script pulls latest `main`, installs deps, runs migrations, syncs posts, builds (blue-green), and reloads PM2. See [DEPLOY.md](DEPLOY.md) for server setup details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
