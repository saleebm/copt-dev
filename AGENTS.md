# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/index.md`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

See [`CLAUDE.md`](CLAUDE.md) for the agent constitution, full architecture, commands, schema, and conventions. This file is the Cursor-Cloud-specific run/test guide.

## Cursor Cloud Bootstrap

Run once per VM. The cloud-starter skill (`.agents/skills/cloud-starter/SKILL.md`) has the full version.

```bash
sudo service postgresql start
bun install
export DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public"
bun run db:generate
bun run db:migrate:dev
bun run db:sync-posts
```

After that, every Prisma/Next.js invocation in the same shell will pick up the local `DATABASE_URL`.

## Services

| Service | How to run |
|---|---|
| PostgreSQL | `sudo service postgresql start` (local user `user` / password `password`, DB `coptdev`) |
| Next.js dev server | `DATABASE_URL=... bun run dev` (portless) or `bun run dev:next` (plain Next) |
| Prisma Studio | `DATABASE_URL=... bun run db:studio` |
| Ingest worker | `DATABASE_URL=... bun run worker` (only when working on the ingest pipeline) |

## Critical Gotcha: `DATABASE_URL`

A `DATABASE_URL` secret is injected from the Cursor secrets store and points at a remote/production database. You **must** override it with the local connection string before running Prisma or Next.js:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public"
```

`prisma.config.ts` uses `dotenv/config` + `env("DATABASE_URL")`, so the override has to be inline or exported before the command — there is no `.env.local` fallback that wins automatically.

## Testing Your Changes

| Check | Command | Expected |
|---|---|---|
| Type check | `bun run typecheck` | Clean (`tsc --noEmit` passes; archive scripts are excluded) |
| Lint | `bun run lint:fix` | Auto-fixes formatting + safe rule violations; review remaining diagnostics |
| E2E | `DATABASE_URL=... bun run test:e2e` | Playwright; requires dev server running and DB synced |
| Post-stack scroll | `DATABASE_URL=... bun run test:scroll` | Subset of `test:e2e` for the post stack |
| Records | `bun run records:validate` | JSON registry integrity + MDX provider parity |
| Build | `DATABASE_URL=... bun run build` | Production build; catches Cache Components / RSC issues |

For UI changes you must also do manual verification — run the dev server and exercise the affected route. The `next-devtools` MCP (`mcp__next-devtools__*`) is available for diagnostics.

## Known Gotchas

- **`bun run lint:check` may surface real diagnostics.** As of writing, `lib/ingest/youtube-url.ts` has one `useConsistentObjectDefinitions` style violation (interface vs `type`). It is a normal lint error, not a config bug — fix it or leave it depending on scope. Earlier versions of this doc claimed `files.ignore` was deprecated; that has since been migrated to `files.includes` with negation.
- **Prisma client is gitignored.** `lib/generated/prisma/` is generated. If imports from `@/lib/generated/prisma` fail, run `bun run db:generate`.
- **MDX content needs syncing.** After migrations or pulling new posts, run `bun run db:sync-posts` to populate the DB. Without it, post pages 404.
- **Portless vs plain Next.** `bun run dev` boots [portless](https://portless.dev) (named `.localhost` URL from `portless.json`). If portless misbehaves in the cloud VM, fall back to `bun run dev:next`.
- **`scripts/archive/` is frozen.** Biome lint and formatting are disabled there (`biome.jsonc` `overrides`). Don't fix issues inside it unless explicitly asked. Old TS shebang errors there will not appear in `bun run typecheck` because the script set is configured to skip them.
- **Long-running watchers (`dev:sync`, `worker:dev`) need their own terminal.** Don't background them in the same shell you're using for migrations.
- **`bun run deploy` is destructive.** It pushes `main` and triggers a remote production deploy. Never run it from a cloud agent VM unless explicitly instructed.

## Common Tasks

| I want to… | Run |
|---|---|
| Add a new post | `bun run new-post` |
| Force-resync content from disk | `bun run db:sync-posts:dry`, then drop `:dry` |
| Reset DB and start fresh | `bun run db:migrate:reset && bun run db:sync-posts` |
| Inspect data | `bun run db:studio` |
| Open a Prisma migration | `bun run db:migrate:create <migration_name>` |
| Lint and format everything | `bun run lint:fix` |
| Run codemods on MDX | `bun run codemods:dry`, review, then `bun run codemods` |
