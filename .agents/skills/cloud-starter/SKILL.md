---
name: cloud-starter
description: Practical setup, run, and test guide for Cloud agents working in this codebase (copt-dev). Use this skill whenever a Cloud agent needs to bootstrap the local environment, start services, run the app, execute database commands, test changes end-to-end, or troubleshoot common environment issues. Triggers on "how do I run this", "set up the environment", "start the app", "run tests", "test my changes", "dev server won't start", or any first-time orientation in this repo.
---

# Cloud Starter — copt-dev

Quick-reference for Cloud agents. Covers bootstrap → run → test → iterate.

## 1. Bootstrap (run once per VM)

```bash
# 1a. Start PostgreSQL
sudo service postgresql start

# 1b. Install dependencies (if node_modules missing or stale)
bun install

# 1c. Generate Prisma client
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:generate

# 1d. Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:migrate:dev

# 1e. Seed the database with MDX content
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:sync-posts
```

The `DATABASE_URL` override is **required** every time you run Prisma or Next.js commands. A remote/production `DATABASE_URL` is injected by Cursor Secrets — you must replace it with the local string above.

Shortcut: export it once per shell session:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public"
```

## 2. Start the Dev Server

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run dev
```

Runs on port 3000 (localhost). Expect output like:

```
▲ Next.js 16.x.x (Turbopack, Cache Components)
✓ Ready in ~500ms
```

No feature flags or login required — the app has no auth layer and no feature flag system. All features are always on.

## 3. Codebase Areas & Testing Workflows

### 3a. App Routes (UI changes)

| Route | File | What it shows |
|-------|------|---------------|
| `/` | `app/page.tsx` | Home page — post list, navigation sidebar |
| `/[...postStack]` | `app/[...postStack]/page.tsx` | Post stack — clicking a post pushes it onto a stack |

**How to test:**

1. Start the dev server.
2. Open the dev server in a browser (use `computerUse` subagent or `agent-browser`).
3. Verify the home page renders posts and the navigation sidebar loads.
4. Click a post link — verify the post stack pushes a new card.
5. Use browser back — verify the stack pops correctly.
6. Check `?stack=slug1,slug2` URL param updates as posts are pushed/popped.

For non-trivial UI changes, always take screenshots and record a demo video.

### 3b. Post Stack System

Core navigation paradigm. Posts stack on top of each other via an XState state machine.

Key files:
- `lib/post-stack-machine.ts` — XState state machine
- `lib/url-state-manager.ts` — URL `?stack=` param sync
- `lib/scroll-utils.ts` — scroll position tracking
- `components/post-stack/` — all stack UI components

**How to test:**

1. Navigate to a post, e.g. `/about`.
2. Click a `PostLink` inside that post to push another post onto the stack.
3. Verify URL updates to include `?stack=` param.
4. Press browser back — stack should pop.
5. Check scroll position is restored when returning to a previous post.

### 3c. Content Pipeline (MDX + JSON providers)

Content comes from two providers registered in `records/providers.json`:
- **MDX provider** — reads `/posts/{type}/*.mdx` files via `lib/content-sources/mdx-provider.ts`
- **JSON provider** — reads `records/posts/*.json` via `lib/content-sources/json-provider.ts`

Both produce `NormalizedPost` records (defined in `lib/content-sources/schema.ts`) that get upserted into PostgreSQL. Prisma tracks provider provenance on each post.

**How to test after editing posts:**

```bash
# Dry run to see what would change
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:sync-posts:dry

# Actual sync
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:sync-posts
```

Verify the output shows the expected created/updated/skipped counts. Then reload the dev server to see changes in the UI.

### 3d. Records & Registries

JSON registries in `records/` define post type metadata, scaffold templates, and provider config. Loaded via Zod-validated loaders in `lib/records/loaders.ts`.

| File | Purpose |
|------|---------|
| `records/post-types.json` | Post type labels, descriptions, order, prompt copy |
| `records/templates.json` | Scaffold template definitions |
| `records/providers.json` | Content provider config (MDX, JSON) |
| `records/posts/` | JSON-managed post records |

**How to test after editing registries:**

```bash
# Validate all JSON registries + provider parity
bun run records:validate
```

This checks schema correctness, referential integrity, and MdxProvider parity. Zero errors = pass.

### 3e. Database / Prisma Schema

Schema: `prisma/schema.prisma`. Models: `Post`, `Tag`, `Category`, `HlexiconEntry`, `CategoryEmbedding`, `TagEmbedding`. Enums: `PostType`, `PostStatus`. Posts track provider provenance.

**After schema changes:**

```bash
# Create a new migration
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:migrate:create <migration-name>

# Apply migrations + regenerate client
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:migrate:dev

# Re-sync posts
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:sync-posts
```

To inspect the database interactively:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run db:studio
```

### 3f. Components

| Directory | Purpose |
|-----------|---------|
| `components/post-stack/` | Post stack cards, lists, renderer, XState provider |
| `components/navigation/` | Sidebar: categories, tags, timeline, terminal |
| `components/mdx/` | MDX-specific: `PostLink`, `Hlexicon` |
| `components/shared/` | `ErrorBoundary`, `EnhancedSuspense`, `Logo` |
| `components/ui/` | shadcn/ui primitives |
| `components/client-wrappers/` | Client wrappers for server-imported components |

Server components by default. Only add `"use client"` when hooks or browser APIs are needed.

### 3g. Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Sync posts | `bun run db:sync-posts` | Content → database |
| Validate records | `bun run records:validate` | JSON registry + provider parity checks |
| Scaffold post | `bun run new-post` | Interactive new post creator |
| Codemods | `bun run codemods` | Batch MDX transformations (dry run) |
| Deduplicate | `bun run deduplicate` | Find duplicate slugs |

Scripts in `scripts/archive/` are legacy — ignore them.

## 4. Linting & Type Checking

```bash
# Lint + auto-fix
bun run lint:fix

# Lint check only (warnings are expected; 0 errors = pass)
bun run lint:check

# Type check (clean pass expected for app code)
bun run typecheck
```

Known noise:
- `lint:check` emits ~39 warnings (nursery rules, shadow variables). These are pre-existing.
- `typecheck` may report errors in `scripts/archive/` only. These are pre-existing and out of scope.

## 5. Build

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coptdev?schema=public" bun run build
```

A successful build with zero errors is the bar for production readiness.

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `PrismaClientInitializationError` or "can't reach database" | PostgreSQL not running. Run `sudo service postgresql start`. |
| `Cannot find module 'lib/generated/prisma'` | Run `bun run db:generate`. |
| `The database is not empty` during migrate reset | Expected — confirm the reset prompt. |
| Dev server starts but pages 500 | Check terminal for Prisma errors; ensure `DATABASE_URL` is the **local** string. |
| `bun install` fails on native modules | Try `bun install --force`. |
| Port 3000 already in use | Find and kill: `lsof -ti:3000 | xargs kill`. |

## 7. Keeping This Skill Updated

When you discover a new setup trick, workaround, or testing workflow:

1. Open this file (`.agents/skills/cloud-starter/SKILL.md`).
2. Add the info to the relevant section, or create a new subsection under §3 if it's a new codebase area.
3. Keep entries terse — command + one-line explanation is ideal.
4. If the trick is environment-specific (e.g., a Cursor Cloud gotcha), note that explicitly.

Examples of things worth adding:
- New env vars or service dependencies.
- Workarounds for flaky setup steps.
- Shortcuts that save substantial time (e.g., partial sync, targeted builds).
- Reproduction recipes for tricky bugs that recur.
