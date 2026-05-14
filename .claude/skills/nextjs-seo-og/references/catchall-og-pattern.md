# Catch-all routes + OG images: the route-handler pattern

## The constraint

In Next.js App Router, the catch-all segment (`[...slug]`) must be the **terminal** segment of a route. You cannot place sibling route-handler files inside a catch-all directory because they would extend the path past the catch-all.

If you put `app/[...postStack]/opengraph-image.tsx` in your tree, the build fails with:

```
Catch-all must be the last part of the URL in route "/[...postStack]/opengraph-image".
```

This is by design — the catch-all "consumes" everything after it, so there's no segment left for `opengraph-image` to occupy.

## What this means for per-slug OG

The file-convention pattern (`app/<route>/opengraph-image.tsx`) is unusable inside catch-all routes. For an app that wants a *different* OG image per post slug, you need a different mechanism.

## The pattern: Route Handler at a dedicated path

Build a Route Handler at a non-catch-all path that accepts the slug as a parameter:

```
app/
└── api/
    └── og/
        └── [slug]/
            └── route.tsx    ← exports GET(req, { params })
```

The route uses `[slug]` (a single dynamic segment), so the catch-all constraint doesn't apply.

```tsx
// app/api/og/[slug]/route.tsx
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadOgAssets, OG_SIZE, OgFrame } from "@/lib/og-image-shared";
import { getPostBySlug } from "@/lib/posts";
import { POST_TYPE_LABELS, siteConfig } from "@/lib/site-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return new Response("Not found", { status: 404 });
  }
  const { logoSrc, fonts } = await loadOgAssets();
  return new ImageResponse(
    <OgFrame
      eyebrow={POST_TYPE_LABELS[post.type] ?? siteConfig.name}
      footer={post.originalDate?.toLocaleDateString("en-US")}
      logoSrc={logoSrc}
      title={post.title}
    />,
    { ...OG_SIZE, fonts }
  );
}
```

Then in the catch-all's `generateMetadata`, point the OG image meta at this URL:

```ts
const ogImage = {
  url: `/api/og/${post.slug}`,
  width: 1200,
  height: 630,
  alt: post.title,
};
return {
  openGraph: { /* ... */, images: [ogImage] },
  twitter: { /* ... */, images: [ogImage.url] },
};
```

`metadataBase` (set in `app/layout.tsx`) prepends the production origin to these relative URLs, so social crawlers see `https://yoursite.com/api/og/some-slug`.

## Why return 404 for unknown slugs

When the post doesn't exist:

```ts
if (!post) {
  return new Response("Not found", { status: 404 });
}
```

Don't fall back to a generic site OG. The page itself 404s (via `notFound()` or by Next not matching), so the OG should match. Returning a 200 with a generic image causes crawlers to index broken share cards.

## What about the root-level OG?

The root `app/opengraph-image.tsx` (file convention) still works because it's at the top of the tree, not inside a catch-all. That handles the home page and any non-catch-all routes that don't define their own OG. Per-post catch-all routes override it via `generateMetadata.openGraph.images`.

This split is intentional:

| Route shape | OG mechanism |
|---|---|
| `app/page.tsx` (home) | File convention at `app/opengraph-image.tsx` |
| `app/about/page.tsx` (static segment) | File convention at `app/about/opengraph-image.tsx` |
| `app/[...slug]/page.tsx` (catch-all) | `generateMetadata` → Route Handler at `app/api/og/[slug]/route.tsx` |

## Alternatives we rejected

- **Query string instead of path param** (`/api/og?slug=foo`): works, but path params produce cleaner URLs that cache more predictably.
- **Single shared `/api/og` with logic to detect "kind"**: collapses concerns. Better to keep one route per dynamic shape.
- **`generateStaticParams` on the catch-all to pre-generate file-convention OG**: still violates the catch-all-must-be-last rule. There is no escape hatch.

## Caching behavior

Per the Next.js docs, route handlers are dynamic by default unless they avoid request-time APIs. This route reads `params` (a request-time API), so each unique slug renders on demand and Next caches the response. Acceptable for OG — crawlers only fetch each URL occasionally, and Next's response cache handles repeat hits.

If you need explicit cache control (e.g., re-render when the post is edited), use `revalidateTag` against a tagged cache wrapping `getPostBySlug`.
