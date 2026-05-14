---
name: nextjs-seo-og
description: Set up complete SEO and dynamic Open Graph previews for Next.js 16+ App Router apps — root metadata, per-route generateMetadata, dynamic OG image generation via `next/og` (ImageResponse + Satori), sitemap, robots, and brand-consistent icons. Use this skill whenever the user mentions SEO, Open Graph, OG images, social previews, link previews, iMessage/Slack/Twitter/LinkedIn share cards, metadata tags, canonical URLs, sitemap.xml, robots.txt, favicon, app icons, or "the preview when I share my site." Also use for catch-all routes that need per-slug previews, stack-based navigation systems where the topmost (currently-viewed) post should drive SEO, and ImageResponse setup with custom fonts. Trigger on phrases like "add SEO", "set up meta tags", "show a logo in previews", "make the preview show the post title", "why does my OG image show localhost", "build a sitemap from my posts", or any time SEO config is being added or fixed.
---

# Next.js SEO + Dynamic OG Previews

This skill captures the working pattern for shipping production SEO in a Next.js 16 App Router app — including dynamic per-route Open Graph images that compose a brand asset with page-specific content (post title, type, date).

The reference implementation lives in this repo (copt.dev). Wherever this skill cites a file, that file is the canonical example.

## Step 0 — Read the Next.js docs (non-negotiable)

Before writing any metadata code, read the relevant section from the locally-installed Next.js docs at `node_modules/next/dist/docs/`. Your training data is older than the current version. Common paths:

| Topic | Path |
|---|---|
| `generateMetadata` / `metadata` object | `01-app/03-api-reference/04-functions/generate-metadata.md` |
| File-based OG images | `01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` |
| Icon conventions | `01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` |
| Sitemap | `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` |
| Robots | `01-app/03-api-reference/03-file-conventions/01-metadata/robots.md` |
| `ImageResponse` | `01-app/03-api-reference/04-functions/image-response.md` |

If the project uses `cacheComponents: true` (Next 16+), read the **"With Cache Components"** section of `generate-metadata.md`. It governs whether your `generateMetadata` needs `'use cache'`, a dynamic marker, or nothing at all.

## Phase 1 — Audit before you write

Spend a few minutes finding what exists. The mistake is starting fresh and stepping on an existing placeholder.

- Grep for existing `metadata` / `generateMetadata` / `Viewport` exports across `app/**`.
- Find a central site-config module or note that strings are scattered.
- List `public/` for brand assets that should appear in OG previews.
- Note any catch-all (`[...slug]`) routes — they force a different OG strategy (see Phase 5).
- Check `next.config.*` for `cacheComponents`, `metadataBase`, image config.

Once you have a real picture, plan the file set. A typical install adds:

| Path | Role |
|---|---|
| `lib/site-config.ts` | Single source of truth (name, description, URL, author, social handles, locale, default OG alt). |
| `lib/og-image-shared.tsx` | Logo loader, font loader, shared `<OgFrame>` JSX. |
| `app/layout.tsx` *(modify)* | Root `metadata` object — title template, OG, Twitter card, robots, alternates. |
| `app/page.tsx` *(modify)* | Home title + canonical. Inherit OG image from file convention. |
| `app/opengraph-image.tsx` + `app/twitter-image.tsx` | Root OG/Twitter card. |
| `app/icon.tsx` + `app/apple-icon.tsx` | Generated brand-consistent favicons. |
| `app/sitemap.ts` + `app/robots.ts` | Crawler hygiene. |
| Per-route `generateMetadata` | Title/description/canonical/OG per page or per slug. |
| Per-slug OG route | For catch-all routes, build at `app/api/og/[slug]/route.tsx`. |

## Phase 2 — Site config + root metadata

Put every brand string in one module so they don't drift across files.

```ts
// lib/site-config.ts
export const siteConfig = {
  name: "copt.dev",
  title: "copt.dev — Mina Saleeb",
  description: "Personal website and blog of Mina Saleeb.",
  url: "https://www.copt.dev",
  author: "Mina Saleeb",
  twitter: "@metapog",
  locale: "en_US",
  ogImageAlt: "copt.dev — the red light eye",
  themeColor: "#000000",
} as const;
export const SITE_URL = siteConfig.url;
```

Root layout sets `metadataBase`, a title template, default description, OG, Twitter card, and robots. **Do not** set OG images here — let the file-convention `app/opengraph-image.tsx` provide them so child routes can either inherit or override via `generateMetadata`. See `app/layout.tsx` for the working version.

Key gotchas:

- `metadataBase: new URL(siteConfig.url)` — without this, relative URLs in metadata become build errors.
- `title: { default: ..., template: '%s — Site Name' }` — child pages set just `title: 'Foo'` and the template appends the brand. Use `title: { absolute: '...' }` to bypass the template (e.g., for the home page).
- `twitter.card: 'summary_large_image'` — required for the 1200×630 preview style.
- `viewport` is its own export (deprecated inside `metadata`).

## Phase 3 — Per-route metadata

For static pages, export a `Metadata` object. For dynamic pages, export `async generateMetadata`. Read params/searchParams via `await` (they're Promises in Next 15+).

### The stack-aware slug rule (critical for post stack systems)

Some apps render multiple posts as a navigable stack. The URL path is the *initial* post, but `?stack=a,b,c` tracks navigation. **SEO must reflect what the user is currently looking at — the topmost post — not the initial route segment.**

```ts
const { postStack } = await params;
const resolvedSearch = await searchParams;
const stackSlugs = resolvedSearch?.stack?.split(",").filter(Boolean) ?? [];
// `.at(-1)` is the top of the stack — what the user is reading.
// Fall back to the path segment for direct navigation with no stack param.
const slug = stackSlugs.at(-1) ?? postStack?.[0];
```

This is non-obvious from Next.js docs alone — see `references/post-stack-seo.md` for the full reasoning and the working `app/[...postStack]/page.tsx`.

### Canonical URLs

Always set `alternates.canonical` to the bare path (`/${post.slug}`), not the full URL with `?stack=`. Otherwise Google indexes every stack permutation as a separate page.

### Description fallback

If a post has no excerpt, build a synthetic description from type + author + date so previews don't repeat the site description. Example:

```ts
const description = post.excerpt
  ?? `A ${typeLabel} by ${siteConfig.author} · ${formattedDate}`;
```

## Phase 4 — Dynamic OG image composition

Use `next/og`'s `ImageResponse` to render JSX into a 1200×630 PNG that combines a brand asset with page-specific text.

The reference frame component (`lib/og-image-shared.tsx → OgFrame`) takes `title`, `eyebrow`, `footer`, and a `logoSrc` and lays them out on a branded gradient background.

Three things trip people up — covered in detail in `references/satori-fonts-and-types.md`:

1. **Loading a local image.** Two patterns work: (a) base64 data URL (`readFile(path, 'base64')` → `data:image/png;base64,...`), or (b) ArrayBuffer + `as unknown as string` cast at the assignment site. Use whichever the project's reviewers prefer; both produce identical bytes at runtime.

2. **Fonts.** Satori supports **TTF, OTF, WOFF** — *not WOFF2*. To use Google Fonts, fetch the CSS endpoint with an older WebKit User-Agent so Google returns WOFF, parse out the URL with a regex that excludes `woff2`, then fetch the font binary. Cache the result in a module-level promise.

3. **TypeScript divergence.** `tsc --noEmit` and `next build`'s built-in typecheck disagree about whether `<img src={ArrayBuffer}>` needs `@ts-expect-error`. The stable fix: drop the directive, cast at the loader (`buffer as unknown as string`), type the prop as `string`. Both checkers stay green.

## Phase 5 — Catch-all routes need a Route Handler, not file convention

**Critical constraint:** Next.js forbids placing `opengraph-image.tsx` (or `twitter-image.tsx`) *inside* a catch-all directory. The catch-all must be the terminal segment of a route. Attempting it produces:

```
Catch-all must be the last part of the URL in route "/[...slug]/opengraph-image"
```

Solution: build a Route Handler at a non-catch-all path that the catch-all's `generateMetadata` points at.

```
app/
└── api/
    └── og/
        └── [slug]/
            └── route.tsx    ← exports GET, returns ImageResponse
```

Then in `generateMetadata`:

```ts
const ogImage = { url: `/api/og/${post.slug}`, width: 1200, height: 630, alt: post.title };
return {
  openGraph: { ..., images: [ogImage] },
  twitter: { ..., images: [ogImage.url] },
};
```

Return a `404` from the route handler when the slug doesn't resolve — don't fall back to a generic image. That way crawlers don't index broken share cards. See `app/api/og/[slug]/route.tsx`.

Full rationale, including alternative approaches we rejected, is in `references/catchall-og-pattern.md`.

## Phase 6 — Icons

Replace any static `app/favicon.ico` with generated `app/icon.tsx` (32×32) and `app/apple-icon.tsx` (180×180) that read the same brand asset. **Delete `app/favicon.ico` after adding `icon.tsx`** — the conventions conflict (favicon takes priority and your dynamic icon won't ship).

## Phase 7 — Sitemap and robots

Query the data source directly inside `app/sitemap.ts`. Don't add a wrapper. Return `MetadataRoute.Sitemap`:

```ts
const posts = await prisma.post.findMany({
  where: { status: PostStatus.PUBLISHED },
  select: { slug: true, lastEdited: true },
  orderBy: { lastEdited: "desc" },
});
return [
  { url: SITE_URL, lastModified: posts[0]?.lastEdited ?? new Date(), changeFrequency: "weekly", priority: 1.0 },
  ...posts.map((p) => ({ url: `${SITE_URL}/${p.slug}`, lastModified: p.lastEdited, changeFrequency: "monthly", priority: 0.7 })),
];
```

For `app/robots.ts`, disallow `/api/`, expose the sitemap URL.

## Phase 8 — Verify (don't skip)

Run all three checks before reporting done.

1. **`bun run typecheck && bun run build`** — both must pass. The build's typecheck and `tsc --noEmit` use slightly different type universes (see Phase 4 #3), so a green typecheck alone is insufficient.

2. **Inspect the prerendered HTML.** For any page using PPR/static prerender, the build emits HTML at `.next/server/app/<route>.html`. Grep it for `og:image`, `twitter:image`, `canonical`. The URLs here are what real social crawlers see — *not* what `curl` shows against the dev server.

3. **Live curl against dev** is still useful, but expect dev quirks: file-convention OG routes (`/opengraph-image`, `/twitter-image`) resolve their URLs against the *request origin* in dev (so you'll see `http://localhost:PORT/opengraph-image`). In production they resolve against `metadataBase`. This is dev-only behavior, not a bug. Always cross-check #2.

Visually verify the OG image itself: `curl -o /tmp/og.png https://yoursite.localhost/api/og/some-slug` then open the PNG. The composed image should show the brand asset + post-specific content + correct dimensions (1200×630).

## When you're done

Send a brief change summary: which files were added/modified, which routes the build emitted (look for `/api/og/[slug]`, `/opengraph-image`, `/twitter-image`, `/icon`, `/apple-icon`, `/sitemap.xml`, `/robots.txt` in the build output), and the verified live URLs that confirmed the OG image renders.

## Reference files

| File | When to read |
|---|---|
| `references/post-stack-seo.md` | Stack-based navigation, surfacing the topmost post in metadata. |
| `references/catchall-og-pattern.md` | The `/api/og/[slug]` workaround, why file-convention doesn't work in catch-alls, and the route-handler pattern in full. |
| `references/satori-fonts-and-types.md` | Loading custom fonts into ImageResponse, Satori's WOFF-not-WOFF2 limit, the `@ts-expect-error` / cast trick for ArrayBuffer img src. |
| `references/verify-build.md` | The dev vs. prod OG URL gotcha and how to validate against `.next/server/app/*.html`. |
