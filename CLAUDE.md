# copt-dev

Personal website/blog built with Next.js 16, App Router, MDX, Prisma + PostgreSQL.

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
  sync-posts.ts           # MDX -> database sync pipeline
  scaffold-post-v2.ts     # Interactive post scaffolding
prisma/
  schema.prisma           # Database schema
types/
  post.ts                 # Post-related types (RenderedPost, etc.)
  navigation.ts           # Navigation types
```

## Post Types & MDX Pipeline

Four post types: `CONCRETE`, `BLOG`, `FINDING`, `SIGHT` (defined in `prisma/schema.prisma` as `PostType` enum).

Content lives in `/posts/{type}/` as `.mdx` or `.md` files with frontmatter. The sync pipeline (`bun run db:sync-posts`) reads files via `lib/mdx-parser.ts`, extracts metadata (title, tags, categories, hlexicon terms), computes file hashes for change detection, and upserts into PostgreSQL via Prisma.

## Post Stack System

The core UI paradigm. Posts stack on top of each other as the user navigates -- clicking a PostLink pushes a new post onto the stack. Managed by an XState state machine (`lib/post-stack-machine.ts`) with:
- URL state via `?stack=slug1,slug2` query param
- Scroll position tracking per post
- Browser back/forward integration
- Programmatic scroll locking during navigation transitions

Route: `app/[...postStack]/` catches all post URLs. The first path segment is the initial post; `?stack=` tracks the full stack.

## Key Conventions

- **Linting**: Biome with ultracite presets (`ultracite/core`, `ultracite/next`, `ultracite/react`). Run `bun run lint:fix` to auto-fix. Linting is disabled for `scripts/` and `tests/`.
- **TypeScript**: Strict mode. `noExplicitAny: error`, `noImplicitAnyLet: error`, `noEvolvingTypes: error`. Never use `any`.
- **Components**: Server components by default. Only add `"use client"` when needed (interactivity, hooks, browser APIs). Client wrappers live in `components/client-wrappers/`.
- **Styling**: Tailwind CSS v4 with `cn()` utility from `lib/utils.ts` for conditional classes.
- **Imports**: Use `@/` path alias (maps to project root).
- **Prisma client**: Generated to `lib/generated/prisma/`. After schema changes, run `bun run db:generate`.
- **React**: v19 canary with React Compiler enabled. Framer Motion for animations.
- **Next.js 16**: `cacheComponents: true`, `reactCompiler: true`, `mdxRs: true`, `inlineCss: true` enabled.
