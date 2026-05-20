# copt-dev

Personal website/blog by Mina Saleeb. Next.js 16 (App Router, React 19 canary, React Compiler, MDX-RS, Cache Components) on Prisma 7 + PostgreSQL, Tailwind v4, XState, Biome, Bun.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/index.md`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Agent Constitution

This file is the top-level authority for all AI agents operating in this repo.

- Don't ship features just because you can.
- Leave the code better than you found it.
- Fixing features and processes > new features.

### Truth Hierarchy (highest to lowest)

1. **Live code & runtime behavior** — what the code actually does beats any doc.
2. **Generated types & schema** — `prisma/schema.prisma`, `lib/generated/prisma/`, `types/`.
3. **`package.json` scripts & `.env.example` defaults** — canonical commands, env var names, default values.
4. **Official/current docs** — react.dev, nextjs.org, prisma.io, etc. Fetch latest when unsure.
5. **Prose docs in this repo** — `README.md`, `DEPLOY.md`, `docs/*.md`, `scripts/*/README.md`. Treat as potentially stale.

When sources conflict, higher-numbered sources lose. Verify against code before trusting prose.

### Anti-Hallucination Rules

- **Never invent** APIs, function signatures, CLI flags, env vars, or behavior. If you don't know, read the code or fetch official docs.
- **Never assume self-limitations.** Use full capabilities — web search, type inspection, doc lookup — to get the right answer.
- **Never fabricate** error messages, config options, or library features. Verify against source.
- **Inspect before asserting.** Read the relevant file, type definition, or schema before claiming what something does.
- **Use online resources** for anything that evolves fast (library APIs, model names, best practices). Don't rely on stale training data.

### Scope Guardrails

- **Only change what the mission requires.** Do not refactor, rename, restyle, or "improve" unrelated code.
- **Do not expand volatile docs** with detailed prose that will go stale. Keep docs short; point to the live source of truth (types, schema, code).
- **`scripts/archive/` is out of scope** unless a live path references it. Biome lint and formatting are disabled there.

### Testing Philosophy

- **Prefer black-box integration testing.** Test observable behavior at real boundaries: routes, UI flows, scripts, database interactions, and CLI entrypoints.
- **Avoid low-signal test bloat.** No mock-heavy, implementation-coupled tests that only restate the code.
- **Optimize for regression detection, not coverage theater.** Add the smallest high-value test surface that would catch real breakage.
- E2E lives in `tests/` and runs via Playwright (`bun run test:e2e`, `bun run test:scroll`). Inline unit tests sit next to source (`*.test.ts`).

### Skill & Doc Precedence

Domain-specific agent skills extend this file but do not override it. Active skills:

- Cloud agent setup & testing — `.agents/skills/cloud-starter/SKILL.md`
- Post Stack system — `.agents/skills/post-stack/SKILL.md`
- React/Next.js performance — `.agents/skills/vercel-react-best-practices/SKILL.md`
- Next.js conventions — `.agents/skills/next-best-practices/SKILL.md`
- Next.js 16 caching — `.agents/skills/next-cache-components/SKILL.md`
- Prisma — `.agents/skills/prisma-cli/SKILL.md`, `prisma-client-api/SKILL.md`, `prisma-postgres/SKILL.md`
- Portless — `.agents/skills/portless/SKILL.md`
- PM2 / production deploy — `.claude/skills/pm2-deploy/SKILL.md`
- Diagnose / TDD / dogfood — `.claude/skills/{diagnose,tdd,dogfood}/SKILL.md`

`.claude/skills/` and `.agents/skills/` both ship; treat them as a single skill pool.

### Skill Self-Validation Protocol

Skills are prose — they rot. Agents must actively question skill docs against live code before trusting them.

**When consulting any skill doc, apply the Truth Hierarchy:**

1. **Verify file paths exist.** If a skill references `lib/foo.ts`, confirm the file is there. Missing file = stale doc.
2. **Verify exports match.** If a skill claims `export function bar()`, read the file and confirm. Renamed/removed export = stale doc.
3. **Verify line references.** If a skill cites `file.ts:42`, read that line range. Drifted content = update the reference.
4. **Verify invariants hold.** If a skill states "X always does Y", read the code path and confirm. Broken invariant = either the code has a bug or the doc is wrong — investigate which.
5. **Verify architectural claims.** If a skill describes a flow (A → B → C), trace it in the actual code. Missing step or changed order = stale doc.

**When staleness is found:**

- If the agent's current task touches the skill's domain: fix the skill doc inline as part of the task.
- If the agent's current task is unrelated: note the staleness but do not fix (scope guardrail).
- Never silently trust a stale pointer. Always resolve against live code first.

Skills with a `## Validation Checklist` section list specific probes. Run them when the skill is loaded for a task in its domain.

## Commands

All commands use `bun`. Never use npm/yarn/pnpm. Source of truth is `package.json` — this list is curated, not exhaustive.

```bash
# Dev
bun run dev                # portless (named .localhost URL)
bun run dev:next           # plain `next dev`
bun run dev:sync           # watch mode for sync-posts (re-syncs on MDX edits)

# Build / Quality
bun run build              # production build (writes to $BUILD_DIR or .next)
bun run lint               # biome check . (CI mode)
bun run lint:fix           # biome check . --write
bun run typecheck          # tsc --noEmit

# Tests
bun run test:e2e           # Playwright, all suites
bun run test:scroll        # Playwright, post-stack scroll suite

# Database
bun run db:generate        # prisma generate
bun run db:migrate:dev     # migrate dev + generate
bun run db:migrate:deploy  # migrate deploy + generate (production)
bun run db:migrate:reset   # destructive reset + generate
bun run db:studio          # Prisma Studio
bun run db:sync-posts      # Sync MDX + JSON content into the DB
bun run db:sync-posts:dry  # Dry run with verbose output

# Content authoring
bun run new-post           # Interactive scaffolder (scripts/scaffold-post-v2.ts)
bun run records:validate   # JSON registry integrity + provider parity
bun run codemods           # MDX codemods (dry run by default)

# Ingest pipeline
bun run worker             # iOS Shortcut ingest worker daemon
bun run worker:dev         # worker in --watch mode
bun run ingest:setup       # bootstrap helper

# Deploy
bun run deploy             # push main, SSH, remote deploy.sh, HTTP 200 verify
```

## Architecture

```
app/                                Next.js App Router
  layout.tsx                        Root layout
  page.tsx                          Home (renders app/components/home-server)
  actions.ts                        Server actions
  globals.css                       Tailwind v4 entry
  icon.tsx | apple-icon.tsx         Generated icons
  opengraph-image.tsx               Default OG image
  twitter-image.tsx                 Default Twitter card
  robots.ts | sitemap.ts            Dynamic robots/sitemap
  api/
    ingest/route.ts                 iOS Shortcut: URL+notes endpoint
    ingest-images/route.ts          iOS Shortcut: image upload endpoint
    og/[slug]/route.tsx             Per-post dynamic OG image
    posts-manifest/route.ts         Posts manifest endpoint
  components/                       Page-scoped components (e.g. home-server.tsx)
  [...postStack]/
    page.tsx                        Catch-all post route + generateMetadata
    components/                     Post stack server components

components/
  post-stack/                       Cards, list, content, interactive shell, observers
  navigation/                       Sidebar, tabs, terminal, post-type filter, breadcrumbs
  mdx/                              MDX-only components (PostLink, ...)
  mdx-components.tsx                MDX -> React component map
  keyboard/                         Command palette, shortcuts, help dialog, a11y skip-link
  shared/                           ErrorBoundary, EnhancedSuspense, Logo, Skeletons, ...
  client-wrappers/                  Thin "use client" wrappers around server-safe components
  ui/                               shadcn/ui primitives
  ascii-art-renderer.tsx, face-ascii.tsx, hlexicon.tsx, findings/sights lists

hooks/                              Client hooks: scroll, navigation, mobile, permalink, ...

lib/
  posts.ts                          DB queries for posts
  mdx-parser.ts                     Frontmatter + metadata + file hash
  mdx-options.ts                    MDX compile options (remark/rehype plugins)
  mdx-validate.ts                   MDX schema validation
  prisma.ts                         Prisma client singleton
  generated/prisma/                 Generated client (gitignored — do not edit)
  post-stack-machine.ts             XState machine
  post-stack-utils-{server,client}.ts, post-stack-helpers.ts
  url-state-manager.ts              URL state (?stack=)
  scroll-utils.ts                   Per-post scroll position tracking
  content-sources/
    schema.ts                       NormalizedPost contract + provider interface
    mdx-provider.ts                 Filesystem MDX adapter
    json-provider.ts                JSON records adapter
    registry.ts                     Provider registry
  records/loaders.ts                Zod-backed JSON registry loaders
  ingest/                           Auth, schemas, hashing, staging, db helpers (shared by route + worker)
  navigation/                       Category tree builder
  validation/                       Navigation Zod schemas
  actions/                          Server-action helpers
  keyboard/                         Shortcut registry, context, hook
  og-image-shared.tsx               Shared OG image rendering
  site-config.ts                    Site name/URL/author/twitter/themeColor
  fonts.ts, animations.ts, constants.ts, invariants.ts, secure-file-utils.ts, utils.ts (cn)
  date-utils.ts (+ test), hlexicon-utils.ts, post-ordering.ts, post-rendering.ts,
    post-content-factory.tsx

posts/
  concrete/   CONCRETE — core/static pages (about, principles, now, root)
  blog/       BLOG — daily entries, essays
  finding/    FINDING — short discoveries/observations
  sight/      SIGHT — visual/image posts

records/
  post-types.json                   Post type registry (labels, descriptions, order, prompt copy)
  templates.json                    Scaffold template registry
  providers.json                    Content provider definitions
  posts/                            JSON-managed post records

prisma/
  schema.prisma                     Schema (Post, Tag, Category, HlexiconEntry,
                                    CategoryEmbedding, TagEmbedding, IngestSubmission +
                                    PostType, PostStatus enums)
  migrations/                       Migration history

scripts/
  sync-posts.ts                     Content -> DB sync pipeline
  dev-sync-posts.ts                 Watch-mode wrapper around sync-posts
  scaffold-post-v2.ts               Interactive post scaffolding (`bun run new-post`)
  validate-records.ts               JSON registry + provider parity validator
  run-codemods.ts | codemods/       MDX codemods (consolidate-categories, consolidate-tags,
                                    rename-md-to-mdx, remove-blank-first-line)
  consolidate-findings-categories.ts, consolidate-tags-embeddings.ts, deduplicate-posts.ts
  ingest-worker.ts                  iOS ingest worker daemon
  setup-ingest.ts                   Ingest bootstrap helper
  lib/
    ai-config.ts                    Canonical AI env vars + model defaults
    cli-parser.ts, watch-runner.ts
    post-type-meta.ts               Post type metadata (derived from records/post-types.json)
    scaffold-{helpers,templates,types}.ts
    services/                       ai-service, database-service, file-service,
                                    interactive-service, post-scaffold-service
    ingest/                         gemini-runner, mdx-writer, git-ops, pr-creator,
                                    pipeline (+ youtube/)
  agent-browser/                    Agent browser test fixtures (snapshots, rewrites)
  roll/                             Daily-roll script + lib
  tiddler-extraction/               TiddlyWiki -> JSON extractor (data/ + lib/)
  deploy-remote.sh                  Local push -> SSH -> remote deploy.sh
  archive/                          Frozen scripts (lint/format disabled, out of scope)

tests/                              Playwright e2e (`post-stack-scroll.spec.ts`)
docs/                               ingest.md + deployment/shared-server-app.md
types/                              Shared TS types (post.ts, navigation.ts)
deploy.sh, ecosystem.config.cjs     Server-side deploy + PM2 config
DEPLOY.md                           Production topology + deploy flow
```

## Database Schema

`prisma/schema.prisma` is the source of truth. Models:

- `Post` — slug, type (`PostType`), status (`PostStatus`), MDX file path + hash, provider provenance (`sourceType`, `providerId`, `sourceRecordId`, `sourceHash`, `syncStatus`, `lastSyncedAt`), relations to tags/categories/hlexicon. `@@unique([providerId, slug])` prevents cross-provider slug collisions.
- `Tag`, `Category` (kebab-case `name` + human `displayName`), `HlexiconEntry`.
- `CategoryEmbedding`, `TagEmbedding` — vector embeddings (`Float[]`) used by consolidation scripts.
- `IngestSubmission` — state machine row for the iOS ingest pipeline (`pending → processing → completed | failed | skipped`).

Enums: `PostType` (`CONCRETE | BLOG | FINDING | SIGHT`), `PostStatus` (`PUBLISHED | DRAFT | ARCHIVED`).

## Post Types & MDX Pipeline

Four post types defined in `prisma/schema.prisma` as `PostType`. Editable metadata (labels, descriptions, order, prompt copy) lives in `records/post-types.json` and is loaded via `lib/records/loaders.ts`. **All consumers derive from the JSON registry — do not hardcode post-type facts.**

Content comes from providers registered in `records/providers.json`:

- `MdxProvider` reads `/posts/{type}/` files.
- `JsonProvider` reads `records/posts/*.json`.

Both produce `NormalizedPost` records (`lib/content-sources/schema.ts`). `scripts/sync-posts.ts` upserts into PostgreSQL via Prisma and writes provider provenance fields. Run `bun run records:validate` to check JSON registry integrity and MDX provider parity.

## Post Stack System

Core UI paradigm. Posts stack as the user navigates; clicking a `PostLink` pushes a new post. Managed by an XState machine (`lib/post-stack-machine.ts`):

- URL state via `?stack=slug1,slug2`.
- Per-post scroll position tracking (`lib/scroll-utils.ts`).
- Browser back/forward integration.
- Programmatic scroll locking during transitions.

Route: `app/[...postStack]/` catches all post URLs. First path segment is the initial post; `?stack=` tracks the rest. See [`.agents/skills/post-stack/SKILL.md`](.agents/skills/post-stack/SKILL.md).

## Ingest Pipeline (iOS Shortcut → PR)

`docs/ingest.md` is the source-of-truth doc. One-liner flow:

```
iOS Shortcut → POST /api/ingest(-images) → IngestSubmission row → worker daemon →
  AI SDK (Gemini + url_context) → MDX file → git branch → gh pr create
```

State lives in `IngestSubmission`. Auth is `Authorization: Bearer $INGEST_TOKEN`. Worker entry: `scripts/ingest-worker.ts`; pipeline stages under `scripts/lib/ingest/`.

## AI & Env Config

Canonical env vars (see `.env.example` for the full list):

- `GEMINI_API_KEY` — primary key for Google GenAI. Scripts also accept `GOOGLE_API_KEY` as fallback.
- `AI_MODEL` — generation model (default `gemini-2.5-flash`).
- `AI_TEMPERATURE` — generation temperature (default `0.7`).
- `EMBEDDING_MODEL` — embedding model (default `gemini-embedding-001`).
- `YOUTUBE_AI_MODEL`, `YOUTUBE_DATA_API_KEY`, `YOUTUBE_CHUNK_*` — YouTube ingest tuning.
- `INGEST_TOKEN`, `INGEST_REPO_PATH`, `INGEST_STAGING_DIR`, `INGEST_POLL_INTERVAL_MS` — ingest worker.

Shared AI config lives in `scripts/lib/ai-config.ts`. AI scripts must import from there instead of hardcoding env lookups or model names.

## Key Conventions

- **Linting**: Biome 2.x with `ultracite/biome/{core,next,react}` extends. `scripts/**` and `tests/**` have linter, formatter, and assist disabled (`biome.jsonc` `overrides`). `scripts/archive/`, `.agents/`, `.claude/` are excluded entirely.
- **TypeScript**: Strict. `noExplicitAny: error`, `noImplicitAnyLet: error`, `noEvolvingTypes: error`, `useAwait: warn`. Never use `any`.
- **Components**: Server components by default. `"use client"` only when needed (interactivity, hooks, browser APIs). Client wrappers live in `components/client-wrappers/`.
- **Styling**: Tailwind CSS v4. Use `cn()` from `lib/utils.ts` for conditional classes.
- **Imports**: `@/` path alias maps to project root.
- **Prisma**: Client generated to `lib/generated/prisma/` (gitignored). After schema changes: `bun run db:generate`.
- **React**: 19 canary with React Compiler enabled. Framer Motion (`motion`) for animations.
- **Next.js 16 flags** (`next.config.mts`): `cacheComponents: true`, `reactCompiler: true`, `experimental.mdxRs`, `experimental.inlineCss`, `experimental.cachedNavigations`, `experimental.optimisticRouting`, `experimental.serverComponentsHmrCache`. `pageExtensions` includes `.mdx`. `distDir` follows `BUILD_DIR` so blue-green deploys can swap builds.
- **Deployment ID**: `next.config.mts` reads `NEXT_DEPLOYMENT_ID` so PM2 cluster reloads do version-skew protection (stale tabs full-reload instead of throwing `Failed to find Server Action`). See `DEPLOY.md`.
