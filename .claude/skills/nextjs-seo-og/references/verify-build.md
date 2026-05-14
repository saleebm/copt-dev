# Verifying SEO: dev quirks vs. production reality

## The dev-vs-prod URL trap

When you `curl` your dev server and inspect the home page HTML, the OG image URL looks like:

```html
<meta property="og:image" content="http://localhost:4177/opengraph-image?abc123"/>
<meta name="twitter:image" content="http://localhost:4177/twitter-image?abc123"/>
```

That `http://localhost:4177` is alarming if you're expecting `https://www.copt.dev/...` from `metadataBase`. **It's not a bug.** File-convention OG image routes (`app/opengraph-image.tsx`, `app/twitter-image.tsx`) resolve their URLs against the **request origin** in dev. In production, they resolve against `metadataBase`.

Crawlers fetch your production URL, see the production-origin OG image meta, and everything works.

## How to verify *without* deploying

Don't rely on dev curls. Verify against the **prerendered HTML** that `next build` emits.

After `bun run build`, look in `.next/server/app/`:

```bash
ls .next/server/app/
# index.html              ← prerendered home
# index.segments/         ← PPR shells
# [...postStack].html     ← prerendered catch-all shell
```

Grep `index.html` for the OG tags:

```bash
grep -oE '<meta[^>]+(og:image|twitter:image|canonical)[^>]*>' .next/server/app/index.html
```

Expected output:

```html
<link rel="canonical" href="https://www.copt.dev"/>
<meta property="og:image" content="https://www.copt.dev/opengraph-image?abc123"/>
<meta name="twitter:image" content="https://www.copt.dev/twitter-image?abc123"/>
```

If these show your production origin, prod is correct regardless of what dev shows.

## Why this happens

Next.js's metadata system has two URL resolution modes:

1. **Static URLs in `metadata.openGraph.images` array** — always resolved against `metadataBase`. Used by `generateMetadata` for catch-all per-slug routes (e.g., `/api/og/${slug}`).
2. **File-convention auto-injected URLs** — built from the request URL in dev (so they work on `localhost`), built from `metadataBase` in prod (so they work for crawlers).

Mode 2 makes development ergonomic (you can preview at `localhost` without faking the host) at the cost of confusing dev inspection. Mode 1 is consistent everywhere.

## Three-step verification ritual

Run all three before declaring done.

### 1. Build green

```bash
bun run typecheck && bun run build
```

Both must pass. Note: `tsc --noEmit` and `next build`'s built-in typecheck differ slightly — a green `tsc` does not guarantee `next build` won't complain (see `satori-fonts-and-types.md` #3).

The build output lists every emitted route. Expect to see:

```
├ ƒ /api/og/[slug]
├ ƒ /apple-icon
├ ƒ /icon
├ ƒ /opengraph-image
├ ○ /robots.txt
├ ƒ /sitemap.xml
└ ƒ /twitter-image
```

`ƒ` = dynamic, `○` = static. Both are fine; OG image routes are typically `ƒ`.

### 2. Inspect prerendered HTML

```bash
grep -oE '<meta[^>]+>|<link[^>]+>' .next/server/app/index.html \
  | grep -iE 'og:|twitter:|canonical|rel="icon|rel="apple' \
  | sort -u
```

Confirm `og:image`, `twitter:image`, and `canonical` all use the production origin from `metadataBase`. Confirm icon links resolve to `/icon` and `/apple-icon`.

### 3. Render the actual images

Visually verify the OG image looks right:

```bash
curl -sk -o /tmp/og-home.png https://yoursite.localhost/opengraph-image
curl -sk -o /tmp/og-post.png https://yoursite.localhost/api/og/some-real-slug
curl -sk -o /tmp/og-404.png -w "%{http_code}\n" https://yoursite.localhost/api/og/does-not-exist
```

Open the PNGs. They should be 1200×630, show the brand logo, and (for the post-specific one) show the post title and type label. The 404 case should return status 404, not a 200 with a generic image.

If using the Read tool on the PNG, you'll see it inline.

## Per-page metadata sanity check

For each page that defines its own metadata, curl and confirm the meta tags reflect the page-specific values:

```bash
curl -sk https://yoursite.localhost/about \
  | grep -oE '<meta[^>]+>|<link[^>]+>' \
  | grep -iE 'og:|twitter:|canonical' \
  | sort -u
```

Look for:

- `og:type=article` (not `website`) on post pages.
- `og:title` matches the post title (with the template suffix from the root layout, e.g., `About — copt.dev`).
- `og:image` points at `/api/og/<slug>`.
- `canonical` is the bare slug path, no `?stack=` or other params.

## Sitemap + robots

```bash
curl -sk https://yoursite.localhost/sitemap.xml | head -30
curl -sk https://yoursite.localhost/robots.txt
```

Sitemap should be well-formed XML with `<loc>` entries for every published slug. Robots should disallow `/api/` and point at the sitemap URL.

## Social preview validators (post-deploy)

Once deployed, run the URL through:

- [Twitter Card Validator](https://cards-dev.twitter.com/validator) (auth required)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [OpenGraph.xyz](https://www.opengraph.xyz/) for a no-auth multi-platform preview
- Send the URL to yourself in iMessage on iOS — the iMessage preview is the strictest renderer and surfaces issues other validators miss.

If any preview is broken in prod but the prerendered HTML looked right, the next thing to check is whether the OG image route is responding 200 with `Content-Type: image/png` and within social-platform size limits (Twitter < 5MB, Facebook < 8MB).
