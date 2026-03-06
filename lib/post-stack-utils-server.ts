/**
 * Server-side utilities for post stack operations
 * These functions require server-side resources like Prisma and should NOT be imported in client components
 */

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
    } catch (_error) {
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
    renderedContent: content,
    isDismissed: false,
    isContentReady: true,
  };
}

/**
 * Fetches and renders multiple posts based on their canonical IDs.
 * This is the main data fetching utility used by both server components.
 *
 * @param canonicalIds - Array of canonical post IDs to fetch and render
 * @param allowNotFound - Whether to include "not found" posts in the result
 * @returns Promise<RenderedPost[]> - Array of rendered posts
 */
export async function getRenderedPosts(
  canonicalIds: string[],
  allowNotFound = true
): Promise<RenderedPost[]> {
  const posts: RenderedPost[] = [];

  for (const canonicalId of canonicalIds) {
    const postData: PostData | null = await getRawPostDataById(canonicalId);

    if (postData) {
      const renderedPost = await createRenderedPost(postData, canonicalId);
      posts.push(renderedPost);
    } else if (allowNotFound) {
      posts.push(createNotFoundPost(canonicalId));
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
  } catch (_error) {
    return [];
  }
}
