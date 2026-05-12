import { createElement, type ReactNode } from "react";
import { Text } from "@/components/shared/text";
import { DEFAULT_POST_ID } from "@/lib/constants";
import { renderMdxContent } from "@/lib/post-rendering";
import { getAllConcretePostIds, getRawPostDataById } from "@/lib/posts";
import type { PostData, RenderedPost } from "@/types/post";

export interface PostStackParams {
  pathParams?: string[]; // e.g., ["post-alpha", "post-bravo"] from catch-all routes
  searchParams?: {
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  };
}

export interface ParsedPostIds {
  pathPostIds: string[];
  postIds: string[];
  searchPostIds: string[];
  source: "combined" | "path" | "search" | "default";
}

/**
 * Parses post IDs from both search params and path params, combining them properly.
 * For catch-all routes, path params come first, then search params are added.
 * For home routes, only search params are used.
 *
 * @param params - Object containing search params and optional path params
 * @returns ParsedPostIds with the resolved post IDs and their sources
 */
export function parsePostStackParams(params: PostStackParams): ParsedPostIds {
  const pathPostIds = params.pathParams?.length ? [...params.pathParams] : [];
  const searchPostIds = params.searchParams?.stack
    ? params.searchParams.stack.split(",").filter(Boolean)
    : [];

  // Combine path and search params, removing duplicates while preserving order
  let combinedIds: string[] = [];

  // Add path params first (for catch-all routes)
  if (pathPostIds.length > 0) {
    combinedIds.push(...pathPostIds);
  }

  // Add search params that aren't already in path params
  if (searchPostIds.length > 0) {
    const uniqueSearchIds = searchPostIds.filter(
      (id) => !pathPostIds.includes(id)
    );
    combinedIds.push(...uniqueSearchIds);
  }

  // Determine source
  let source: ParsedPostIds["source"];
  if (combinedIds.length === 0) {
    combinedIds = [DEFAULT_POST_ID];
    source = "default";
  } else if (pathPostIds.length > 0 && searchPostIds.length > 0) {
    source = "combined";
  } else if (pathPostIds.length > 0) {
    source = "path";
  } else {
    source = "search";
  }

  return {
    postIds: combinedIds,
    pathPostIds,
    searchPostIds,
    source,
  };
}

/**
 * Processes and deduplicates post IDs, ensuring they're valid.
 *
 * @param postIds - Array of post IDs to process
 * @returns Processed array with duplicates removed and fallback to default if empty
 */
export function processPostIds(postIds: string[]): string[] {
  // Remove duplicates while preserving order
  const uniqueIds = [...new Set(postIds.filter(Boolean))];

  // Fallback to default if empty
  if (uniqueIds.length === 0) {
    return [DEFAULT_POST_ID];
  }

  return uniqueIds;
}

/**
 * Helper function to create a Text element with proper children
 */
function createTextElement(props: {
  content: string;
  variant?: "default" | "error" | "warning" | "muted";
  className?: string;
  preserveWhitespace?: boolean;
}) {
  const { content, ...restProps } = props;
  return createElement(Text, { ...restProps }, content);
}

/**
 * Converts PostData to RenderedPost with proper content rendering.
 * Handles both MDX and plain text content with error handling.
 *
 * @param postData - The raw post data
 * @param instanceId - Unique instance ID for this post in the stack
 * @returns Promise<RenderedPost> - The rendered post ready for UI
 */
export async function createRenderedPost(
  postData: PostData,
  instanceId: string
): Promise<RenderedPost> {
  let content: ReactNode;

  if (postData.isMdx) {
    try {
      content = await renderMdxContent(postData.rawContent);
    } catch {
      content = createTextElement({
        content: "Error rendering MDX.",
        variant: "error",
        className: "p-4",
      });
    }
  } else {
    content = createTextElement({
      content: postData.rawContent,
      preserveWhitespace: true,
    });
  }

  return {
    id: instanceId,
    originalId: postData.id,
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
 * Creates a "not found" rendered post for missing post data.
 *
 * @param canonicalId - The ID that wasn't found
 * @returns RenderedPost with error content
 */
export function createNotFoundPost(canonicalId: string): RenderedPost {
  return {
    id: canonicalId,
    originalId: canonicalId,
    title: `Post "${canonicalId}" Not Found`,
    renderedContent: createTextElement({
      content: "Content not found.",
      variant: "warning",
      className: "p-4",
    }),
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
  } catch {
    return [];
  }
}

/**
 * Parses the current browser URL to extract post IDs for browser navigation sync.
 * Handles both home route (/) and catch-all route patterns.
 *
 * @param isRootPage - Whether we're on the root page or catch-all route
 * @returns ParsedPostIds with the resolved post IDs from the current URL
 */
export function parseCurrentUrl(isRootPage: boolean): ParsedPostIds {
  if (typeof window === "undefined") {
    // Server-side fallback
    return {
      postIds: [DEFAULT_POST_ID],
      pathPostIds: [],
      searchPostIds: [],
      source: "default",
    };
  }

  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const pathSegments = url.pathname.split("/").filter(Boolean);

  const params: PostStackParams = {
    searchParams: {
      stack: searchParams.get("stack") || undefined,
    },
    pathParams: isRootPage ? [] : pathSegments,
  };

  return parsePostStackParams(params);
}
