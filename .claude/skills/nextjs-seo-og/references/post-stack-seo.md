# Post Stack SEO: surfacing the topmost post

## The problem

Some apps render content as a navigable stack — clicking a link inside a post pushes a new post on top rather than replacing the page. The browser URL pattern typically looks like:

```
/post-alpha?stack=post-alpha,post-bravo,post-charlie
```

- The **path** (`/post-alpha`) is the *initial* post — the entry point.
- The **`?stack=` query param** is the full navigation history. The last element is what the user is *currently looking at*.

If `generateMetadata` keys off the path alone, every share link will preview the entry-point post, not the post on top of the stack. That's wrong: a user sharing the URL is sharing what they're reading, which is the top of the stack.

## The fix

Read both `params` and `searchParams`. Resolve the slug as "topmost stack entry, falling back to path segment":

```ts
export async function generateMetadata({
  params,
  searchParams,
}: PostStackPageProps): Promise<Metadata> {
  const { postStack } = await params;
  const resolvedSearch = await searchParams;
  const stackSlugs = resolvedSearch?.stack?.split(",").filter(Boolean) ?? [];
  const slug = stackSlugs.at(-1) ?? postStack?.[0];
  // ...fetch post by slug, return metadata
}
```

`Array.prototype.at(-1)` is the cleanest "last element" idiom. Empty-stack fallback to `postStack?.[0]` covers direct navigation (no `?stack=` query).

## Canonical URL

Always set `alternates.canonical` to the **bare slug path** (e.g., `/${post.slug}`). Never include the `?stack=` param. The stack is navigational state, not part of the canonical resource identity. Without this, Google indexes every stack permutation as a distinct page.

## Cache Components implications

In Next.js 16 with `cacheComponents: true`, reading `params` or `searchParams` makes `generateMetadata` dynamic by definition. Two options:

1. **The page is already dynamic.** If the route also reads `params`/`searchParams` in its rendering (as a post stack page invariably does), Next will defer metadata to request time alongside the page render. Nothing special needed.

2. **The page is otherwise static.** You'd need to either mark `generateMetadata` with `'use cache'` (only safe if the data is stable per slug) or add a dynamic marker to the page. See `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` → "With Cache Components" for the exact recipe.

## Reference implementation

`app/[...postStack]/page.tsx` in this repo. Look at `generateMetadata` — it handles the empty-stack case, the missing-post case (returns `{ title: 'Not found', robots: { index: false, follow: false } }`), and builds a synthetic description from post type + author + date when an excerpt isn't available.

## Why not use `searchParams` for OG image too?

The per-slug OG image route (`/api/og/[slug]`) takes the slug as a *path* parameter. Once `generateMetadata` has resolved which slug to use (topmost stack entry), it threads that slug into the OG image URL:

```ts
const ogImage = { url: `/api/og/${post.slug}`, width: 1200, height: 630, alt: post.title };
```

The OG route itself doesn't need to know about the stack — it just renders an image for the specific slug it was given. This is correct because the OG image is keyed by slug, not by stack context.
