# AGENTS.md

See `CLAUDE.md` for full architecture, commands, and conventions.

## Cursor Cloud specific instructions

### Services

| Service | How to run |
|---|---|
| PostgreSQL | `sudo service postgresql start` (local, user `user` / password `password`, DB `coptdev`) |
| Next.js dev server | `DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run dev` |

### Gotchas

- A `DATABASE_URL` secret is injected into the environment from the Cursor secrets store, pointing to a remote/production database. You **must** override it with the local connection string when running Prisma commands or the dev server: `DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public"`.
- After `bun install`, run `bun run db:generate` to regenerate the Prisma client if it's missing or stale.
- After migrations, run `bun run db:sync-posts` to populate the database with MDX content from `/posts/`.
- `bun run lint:check` currently fails due to a pre-existing Biome config issue (`files.ignore` is deprecated in Biome 2.x; should be `files.includes` with negation). This is not caused by agent changes.
- `bun run typecheck` reports errors only in `scripts/archive/` (shebang syntax). These are pre-existing and do not affect the app.
- The `prisma.config.ts` uses `dotenv/config` + `env("DATABASE_URL")`, so the env var override must be passed inline or exported before running Prisma/Next commands.
