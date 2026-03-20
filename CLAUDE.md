# copt-dev

Personal website/blog built with Next.js 16, App Router and latest best practices/features of React and Next.js, MDX, Prisma + PostgreSQL.

<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

## Agent Constitution

This file is the top-level authority for all AI agents operating in this repo. Follow it strictly.

- Don't ship features just because you can
- leave the code better than you found it
- fixing features & processes > new features

### Truth Hierarchy (highest to lowest)

1. **Live code & runtime behavior** — what the code actually does beats any doc.
2. **Generated types & schema** — `prisma/schema.prisma`, `lib/generated/prisma/`, `types/`.
3. **`package.json` scripts & `.env` defaults** — canonical commands, env var names, default values.
4. **Official/current docs & web** — fetch latest from react.dev, nextjs.org, prisma.io, etc. when unsure.
5. **Prose docs in this repo** — `README.md`, `scripts/*/README.md`, archived docs. Treat as potentially stale.

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
- **Archive files are out of scope** unless a live path references them.

### Testing Philosophy

- **Prefer black-box integration testing.** Test observable behavior at real boundaries: routes, UI flows, scripts, database interactions, and CLI entrypoints.
- **Avoid low-signal test bloat.** Do not add mock-heavy, implementation-coupled tests that only restate the code.
- **Optimize for regression detection, not coverage theater.** Add the smallest high-value test surface that would catch real breakage.

### Skill & Doc Precedence

Domain-specific agent skills extend this file — they do not override it:
- React/Next.js performance: `.agents/skills/vercel-react-best-practices/AGENTS.md`
- Next.js conventions: `.agents/skills/next-best-practices/SKILL.md`
- Next.js 16 caching: `.agents/skills/next-cache-components/SKILL.md`
- Prisma: `.agents/skills/prisma-*/SKILL.md`
- Post Stack system: `.agents/skills/post-stack/SKILL.md`
- Cloud agent setup & testing: `.agents/skills/cloud-starter/SKILL.md`

### Skill Self-Validation Protocol

Skills are prose — they rot. Agents must actively question skill docs against live code before trusting them.

**When consulting any skill doc, apply the Truth Hierarchy:**
1. **Verify file paths exist.** If a skill references `lib/foo.ts`, confirm the file is there. Missing file = stale doc.
2. **Verify exports match.** If a skill claims `export function bar()`, read the file and confirm. Renamed/removed export = stale doc.
3. **Verify line references.** If a skill cites `file.ts:42`, read that line range. Drifted content = update the reference.
4. **Verify invariants hold.** If a skill states "X always does Y", read the code path and confirm. Broken invariant = either the code has a bug or the doc is wrong — investigate which.
5. **Verify architectural claims.** If a skill describes a flow (A -> B -> C), trace it in the actual code. Missing step or changed order = stale doc.

**When staleness is found:**
- If the agent's current task touches the skill's domain: fix the skill doc inline as part of the task.
- If the agent's current task is unrelated: note the staleness but do not fix (scope guardrail).
- Never silently trust a stale pointer. Always resolve against live code first.

**Skills with a `## Validation Checklist` section** list specific probes. Run them when the skill is loaded for a task in its domain.

## Commands

All commands use `bun`. Never use npm/yarn/pnpm.

```bash
bun run dev              # Start dev server
bun run build            # Production build
bun run lint:fix         # Biome lint + format (auto-fix)
bun run typecheck        # TypeScript check (tsc --noEmit)
bun run db:generate      # Regenerate Prisma client
bun run db:migrate:dev   # Run migrations + generate
bun run db:sync-posts    # Sync MDX files from /posts/ into database
bun run db:sync-posts:dry # Dry run with verbose output
bun run new-post         # Scaffold a new post (interactive)
bun run records:validate # Validate JSON registries + provider parity
bun run codemods         # Run codemods (dry run by default)
```

## Architecture

```
app/
  layout.tsx              # Root layout
  page.tsx                # Home page
  [...postStack]/         # Catch-all route for post stack navigation
    page.tsx              # Renders PostStackServer
lib/
  mdx-parser.ts           # Parses MDX frontmatter, generates metadata + file hashes
  posts.ts                # Database queries for posts
  post-stack-machine.ts   # XState state machine for post stack navigation
  post-stack-utils-*.ts   # Server/client post stack helpers
  url-state-manager.ts    # URL-based state for post stacks
  scroll-utils.ts         # Scroll position management
  prisma.ts               # Prisma client singleton
  utils.ts                # cn() classname utility (clsx + tailwind-merge)
  generated/prisma/       # Generated Prisma client (do not edit)
components/
  post-stack/             # Post stack UI components (cards, lists, interactive shell)
  navigation/             # Sidebar navigation (categories, tags, timeline, terminal)
  mdx/                    # MDX-specific components (PostLink, etc.)
  shared/                 # Reusable components (ErrorBoundary, EnhancedSuspense, etc.)
  ui/                     # shadcn/ui primitives
posts/
  concrete/               # CONCRETE posts (core/static pages: about, principles, now, root)
  blog/                   # BLOG posts (daily entries, essays)
  finding/                # FINDING posts (short discoveries/observations)
  sight/                  # SIGHT posts (visual/image posts)
scripts/
  sync-posts.ts           # Content -> database sync pipeline
  scaffold-post-v2.ts     # Interactive post scaffolding
  validate-records.ts     # JSON registry + parity validation
  lib/ai-config.ts        # Shared AI config (canonical env vars, model defaults)
  lib/post-type-meta.ts   # Post type metadata (derived from records/post-types.json)
records/
  post-types.json         # Post type registry (labels, descriptions, order, prompt copy)
  templates.json          # Scaffold template registry
  providers.json          # Content provider definitions
  posts/                  # JSON-managed post records
prisma/
  schema.prisma           # Database schema (source of truth for PostType, PostStatus + provenance)
lib/
  content-sources/        # Content provider abstraction
    schema.ts             # NormalizedPost contract + provider interface
    mdx-provider.ts       # Filesystem MDX adapter
    json-provider.ts      # JSON records adapter
    registry.ts           # Provider registry
  records/                # Zod-backed JSON record loaders
    loaders.ts            # Validated loaders for all registries
types/
  post.ts                 # Post-related types (RenderedPost, etc.)
  navigation.ts           # Navigation types
```

## Post Types & MDX Pipeline

Four post types: `CONCRETE`, `BLOG`, `FINDING`, `SIGHT` — defined in `prisma/schema.prisma` as `PostType` enum. Editable metadata (labels, descriptions, order, prompt copy) lives in `records/post-types.json` and is loaded via `lib/records/loaders.ts`. All consumers derive from the JSON registry; do not hardcode post-type facts.

Content comes from providers registered in `records/providers.json`. The MDX provider reads `/posts/{type}/` files; the JSON provider reads `records/posts/*.json`. Both produce `NormalizedPost` records (defined in `lib/content-sources/schema.ts`) that the sync pipeline upserts into PostgreSQL via Prisma. Prisma tracks provider provenance on each post.

Run `bun run records:validate` to check JSON registry integrity and MdxProvider parity.

## Post Stack System

The core UI paradigm. Posts stack on top of each other as the user navigates — clicking a PostLink pushes a new post onto the stack. Managed by an XState state machine (`lib/post-stack-machine.ts`) with:
- URL state via `?stack=slug1,slug2` query param
- Scroll position tracking per post
- Browser back/forward integration
- Programmatic scroll locking during navigation transitions

Route: `app/[...postStack]/` catches all post URLs. The first path segment is the initial post; `?stack=` tracks the full stack.

## AI & Env Config

Canonical env vars for AI features (see `.env.example`):
- `GEMINI_API_KEY` — primary API key for Google GenAI. Scripts also accept `GOOGLE_API_KEY` as fallback.
- `AI_MODEL` — model name for generation tasks (default: see `.env.example`).
- `AI_TEMPERATURE` — temperature for generation (default: `0.7`).
- `EMBEDDING_MODEL` — model for embedding tasks (default: `gemini-embedding-001`).

Shared config lives in `scripts/lib/ai-config.ts`. All AI scripts import from there instead of hardcoding env lookups or model names.

## Key Conventions

- **Linting**: Biome with ultracite presets (`ultracite/core`, `ultracite/next`, `ultracite/react`). Run `bun run lint:fix` to auto-fix. Linting is disabled for `scripts/` and `tests/`.
- **TypeScript**: Strict mode. `noExplicitAny: error`, `noImplicitAnyLet: error`, `noEvolvingTypes: error`. Never use `any`.
- **Components**: Server components by default. Only add `"use client"` when needed (interactivity, hooks, browser APIs). Client wrappers live in `components/client-wrappers/`.
- **Styling**: Tailwind CSS v4 with `cn()` utility from `lib/utils.ts` for conditional classes.
- **Imports**: Use `@/` path alias (maps to project root).
- **Prisma client**: Generated to `lib/generated/prisma/`. After schema changes, run `bun run db:generate`.
- **React**: v19 canary with React Compiler enabled. Framer Motion for animations.
- **Next.js 16**: `cacheComponents: true`, `reactCompiler: true`, `mdxRs: true`, `inlineCss: true` enabled.
