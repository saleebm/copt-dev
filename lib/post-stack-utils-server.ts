/**
 * Server-side utilities for post stack operations
 * These functions require server-side resources like Prisma and should NOT be imported in client components
 */

import { cacheLife, cacheTag } from "next/cache";
import { ensurePostIdInvariant } from "@/lib/invariants";
import { renderMdxContent } from "@/lib/post-rendering";
import { createNotFoundPost } from "@/lib/post-stack-utils-client";
import { getAllConcretePostIds, getRawPostDataById } from "@/lib/posts";
import type { PostData, PostId, RenderedPost } from "@/types/post";

/**
 * Creates a rendered post from raw post data.
 * Handles content rendering based on post type (MDX or plain).
 *
 * @param postData - The raw post data
 * @param canonicalId - The canonical ID of the post
 * @returns Promise<RenderedPost> - The rendered post object
 */
export async function createRenderedPost(
  postData: PostData,
  canonicalId: PostId
): Promise<RenderedPost> {
  let content: React.ReactNode;

  if (postData.isMdx) {
    try {
      content = await renderMdxContent(postData.rawContent);
    } catch {
      // Import createElement and Text to create error element
      const { createElement } = await import("react");
      const { Text } = await import("@/components/shared/text");
      content = createElement(
        Text,
        {
          variant: "error",
          className: "p-4",
        },
        "Error rendering MDX."
      );
    }
  } else {
    // Import createElement and Text to create text element
    const { createElement } = await import("react");
    const { Text } = await import("@/components/shared/text");
    content = createElement(
      Text,
      {
        preserveWhitespace: true,
      },
      postData.rawContent
    );
  }

  // Invariant: id === originalId === slug
  const id: PostId = canonicalId;
  const originalId: PostId = postData.id;
  ensurePostIdInvariant(id, originalId, "createRenderedPost");

  return {
    id,
    originalId,
    title: postData.title,
    lastEdited: postData.lastEdited,
    createdAt: postData.createdAt,
    type: postData.type,
    tags: postData.tags,
    originalUrl: postData.originalUrl,
    renderedContent: content,
    isDismissed: false,
    isContentReady: true,
  };
}

/**
 * Cached per-slug rendered post. Cache key derives from the `slug` arg, so
 * each post gets its own entry tagged with `post:${slug}`.
 *
 * Returns `null` when the slug doesn't resolve to a published post — callers
 * must keep the "not found" handling (and the sentinel) uncached so URL state
 * stays request-shaped.
 */
export async function getRenderedPostBySlug(
  slug: string
): Promise<RenderedPost | null> {
  "use cache";
  cacheLife("days");
  cacheTag("posts", `post:${slug}`);

  const postData = await getRawPostDataById(slug);
  if (!postData) {
    return null;
  }
  return await createRenderedPost(postData, slug);
}

/**
 * Fetches and renders multiple posts based on their canonical IDs.
 * Stays uncached so that per-request stack ordering and `allowNotFound`
 * handling remain request-shaped, while delegating the heavy MDX render to
 * the cached per-slug function above.
 *
 * @param canonicalIds - Array of canonical post IDs to fetch and render
 * @param allowNotFound - Whether to include "not found" posts in the result
 * @returns Promise<RenderedPost[]> - Array of rendered posts (original order preserved)
 */
export async function getRenderedPosts(
  canonicalIds: string[],
  allowNotFound = true
): Promise<RenderedPost[]> {
  const resolved = await Promise.all(
    canonicalIds.map((id) => getRenderedPostBySlug(id))
  );

  const posts: RenderedPost[] = [];
  for (let i = 0; i < canonicalIds.length; i++) {
    const rendered = resolved[i];
    if (rendered) {
      posts.push(rendered);
    } else if (allowNotFound) {
      posts.push(createNotFoundPost(canonicalIds[i]));
    }
    // If post not found and allowNotFound is false, skip silently
  }
  return posts;
}

/**
 * Get all concrete post IDs from the database.
 * Uses the centralized getAllConcretePostIds function for consistency.
 *
 * @returns Promise<string[]> - Array of concrete post IDs from database
 */
export async function getConcretePostIds(): Promise<string[]> {
  try {
    // Use the centralized function that handles caching and proper query logic
    return await getAllConcretePostIds();
  } catch {
    return [];
  }
}
