/**
 * Client-side utilities for post stack operations
 * These functions can be safely used in client components
 */

import { createElement, type ReactNode } from "react";
import { Text } from "@/components/shared/text";
import { DEFAULT_POST_ID } from "@/lib/constants";
import type { RenderedPost } from "@/types/post";

export type PostStackParams = {
  searchParams?: {
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  };
  pathParams?: string[]; // e.g., ["post-alpha", "post-bravo"] from catch-all routes
};

export type ParsedPostIds = {
  postIds: string[];
  pathPostIds: string[];
  searchPostIds: string[];
  source: "combined" | "path" | "search" | "default";
};

/**
 * Creates a text element for rendering.
 * Utility for creating consistent text elements in post content.
 */
function createTextElement(props: {
  content: string;
  variant?: "default" | "error" | "warning" | "muted";
  className?: string;
  preserveWhitespace?: boolean;
}): ReactNode {
  const { content, ...restProps } = props;
  return createElement(Text, { ...restProps }, content);
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
  if (pathPostIds.length > 0 && searchPostIds.length > 0) {
    source = "combined";
  } else if (pathPostIds.length > 0) {
    source = "path";
  } else if (searchPostIds.length > 0) {
    source = "search";
  } else {
    source = "default";
  }

  // Fallback to DEFAULT_POST_ID if no IDs were found
  if (combinedIds.length === 0) {
    combinedIds = [DEFAULT_POST_ID];
    source = "default";
  }

  return {
    postIds: combinedIds,
    pathPostIds,
    searchPostIds,
    source,
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
  const searchParams = url.searchParams;
  const searchPostIds =
    searchParams.get("stack")?.split(",").filter(Boolean) || [];

  let pathPostIds: string[] = [];

  if (!isRootPage) {
    // For catch-all routes, parse the pathname
    const pathSegments = url.pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => segment !== "_next" && !segment.startsWith("_"));

    pathPostIds = pathSegments;
  }

  // Combine path and search params
  const combinedIds = [...pathPostIds];
  for (const searchId of searchPostIds) {
    if (!combinedIds.includes(searchId)) {
      combinedIds.push(searchId);
    }
  }

  // Determine source
  let source: ParsedPostIds["source"];
  if (pathPostIds.length > 0 && searchPostIds.length > 0) {
    source = "combined";
  } else if (pathPostIds.length > 0) {
    source = "path";
  } else if (searchPostIds.length > 0) {
    source = "search";
  } else {
    source = "default";
  }

  // Fallback to DEFAULT_POST_ID if no IDs
  if (combinedIds.length === 0) {
    combinedIds.push(DEFAULT_POST_ID);
    source = "default";
  }

  return {
    postIds: combinedIds,
    pathPostIds,
    searchPostIds,
    source,
  };
}
