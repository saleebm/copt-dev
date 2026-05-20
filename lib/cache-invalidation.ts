/**
 * Server-only helpers for invalidating Next.js Cache Components tags.
 *
 * Must run inside the Next.js runtime (route handler, server action, server
 * component). Calling these from a standalone Node script (e.g. sync-posts)
 * is a no-op at the cache layer — use the `/api/internal/revalidate` route
 * handler from external scripts instead.
 */

import "server-only";
import { revalidateTag } from "next/cache";

export const NAV_TAG = "nav";
export const POSTS_TAG = "posts";

export function postTag(slug: string): string {
  return `post:${slug}`;
}

// Next 16 `revalidateTag(tag, profile)` — the second arg controls the
// stale-while-revalidate window. Docs recommend `"max"` so users see stale
// content immediately while fresh data loads in the background.
const STALE_WINDOW = "max";

export function invalidateNav(): void {
  revalidateTag(NAV_TAG, STALE_WINDOW);
}

export function invalidateAllPosts(): void {
  revalidateTag(POSTS_TAG, STALE_WINDOW);
}

export function invalidatePost(slug: string): void {
  revalidateTag(postTag(slug), STALE_WINDOW);
}

/**
 * Convenience helper for content sync: invalidate any number of slugs plus
 * the nav aggregate tag in one call.
 */
export function invalidateAfterSync(slugs: string[]): void {
  invalidateNav();
  invalidateAllPosts();
  for (const slug of slugs) {
    invalidatePost(slug);
  }
}

/**
 * Low-level: revalidate an arbitrary list of tags. Used by the revalidate
 * route handler so the external sync script can name the tags directly.
 */
export function invalidateTags(tags: readonly string[]): void {
  for (const tag of tags) {
    revalidateTag(tag, STALE_WINDOW);
  }
}
