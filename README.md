# copt-dev

Source for [copt.dev](https://copt.dev) — a personal site and blog by Mina Saleeb.

Stack: Next.js 16 (App Router, React 19 canary, React Compiler, MDX-RS, Cache Components) · Prisma 7 + PostgreSQL · Tailwind v4 · XState · Biome (ultracite) · Bun.

## Quick Start

```bash
bun install
bun run db:generate
bun run db:migrate:dev
bun run db:sync-posts
bun run dev
```

`bun run dev` runs [portless](https://portless.dev) and serves the site at the named `.localhost` URL configured in `portless.json`. To skip portless, run `bun run dev:next` and open the printed `localhost:<port>` URL.

A working `.env` is required — copy `.env.example` and fill in `DATABASE_URL`, `GEMINI_API_KEY`, and (if using the iOS ingest pipeline) `INGEST_TOKEN` / `INGEST_REPO_PATH`.

## Layout

```
app/                Next.js App Router routes (incl. API + sitemap/og/icons)
components/         UI: post-stack, navigation, mdx, keyboard, shared, ui
hooks/              Client hooks (scroll, navigation, mobile, permalink, etc.)
lib/                Core libs: posts, mdx, prisma, content sources, ingest, navigation
posts/              MDX content (concrete, blog, finding, sight)
records/            JSON registries (post types, providers, templates, posts)
prisma/             Schema + migrations
scripts/            Sync, scaffold, ingest worker, codemods, roll, tiddler extraction
tests/              Playwright e2e
docs/               Deployment + ingest pipeline docs
```

## Common Commands

```bash
bun run dev               # Dev server (via portless)
bun run build             # Production build
bun run lint:fix          # Biome + ultracite (auto-fix)
bun run typecheck         # tsc --noEmit
bun run test:e2e          # Playwright
bun run db:migrate:dev    # Run migrations + regenerate client
bun run db:sync-posts     # MDX/JSON -> database
bun run new-post          # Interactive post scaffolding
bun run records:validate  # Validate JSON registries + provider parity
bun run worker            # iOS ingest worker daemon
bun run deploy            # Push main, SSH, run remote deploy
```

Full script list: see `package.json`.

## Deploying

```bash
bun run deploy
```

Pushes `main`, SSHes into the server, and runs `deploy.sh`: pull, install, migrate, sync posts, blue-green build, PM2 reload, HTTP 200 verify. See [`DEPLOY.md`](DEPLOY.md) for the server topology and [`docs/deployment/shared-server-app.md`](docs/deployment/shared-server-app.md) for onboarding another app to the same host.

## Subsystems Worth Knowing

- **Post Stack** — XState-driven stacked navigation with URL state and scroll coordination. See [`.agents/skills/post-stack/SKILL.md`](.agents/skills/post-stack/SKILL.md).
- **Content Sources** — Pluggable MDX + JSON providers normalized into Prisma via the sync pipeline (`lib/content-sources/`, `scripts/sync-posts.ts`).
- **Ingest Pipeline** — iOS Shortcut → API route → `IngestSubmission` row → `scripts/ingest-worker.ts` → Gemini-structured MDX → git branch → draft PR. See [`docs/ingest.md`](docs/ingest.md).

## For AI Agents

[`CLAUDE.md`](CLAUDE.md) is the agent constitution: truth hierarchy, anti-hallucination rules, scope guardrails, and the live architecture map. [`AGENTS.md`](AGENTS.md) holds Cursor-Cloud-specific run/test instructions. Skills live under [`.agents/skills/`](.agents/skills) and [`.claude/skills/`](.claude/skills).
