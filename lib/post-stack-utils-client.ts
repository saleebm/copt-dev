/**
 * Client-side utilities for post stack operations
 * These functions can be safely used in client components
 */

import { createElement, type ReactNode } from "react";
import { Text } from "@/components/shared/text";
import { DEFAULT_POST_ID } from "@/lib/constants";
import type { RenderedPost } from "@/types/post";

/**
 * Per-post scroll anchor. We restore the reading position by locating the
 * nearest heading the user was reading (anchor id from rehype-slug) plus a
 * small pixel offset between that heading and the viewport top.
 *
 * Anchoring is robust to MDX content above shifting (images loading, code
 * blocks expanding), unlike raw scrollY which becomes meaningless once
 * document height changes.
 */
export interface AnchorState {
  /** Heading id within the post, or "__top__" if user is above any heading. */
  anchorId: string;
  /** Pixels from the anchor's top to the viewport top. Clamped >= 0. */
  fineOffsetPx: number;
}

export type ScrollMemory = Record<string /* postId */, AnchorState>;

const SESSION_KEY = "copt:scroll";
const TOP_ANCHOR = "__top__";
const HEADING_SELECTOR = ":is(h1,h2,h3,h4,h5,h6)[id]";

function postSelector(postId: string): string {
  return `section[data-post-id="${postId}"]`;
}

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

/**
 * Capture the user's reading position within `postId` as an anchor + offset.
 * Caller invokes this on `scrollend` (deterministic stillness signal), never
 * on a timer.
 *
 * Returns null if the post element isn't mounted.
 */
export function captureAnchorForPost(postId: string): AnchorState | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const postEl = document.querySelector(
    postSelector(postId)
  ) as HTMLElement | null;
  if (!postEl) {
    return null;
  }

  const postRect = postEl.getBoundingClientRect();

  // User hasn't scrolled into the post yet — store top.
  if (postRect.top >= 0) {
    return { anchorId: TOP_ANCHOR, fineOffsetPx: 0 };
  }

  // Find the heading nearest the viewport top from above (largest top <= 0).
  const headings = postEl.querySelectorAll<HTMLElement>(HEADING_SELECTOR);
  let best: { id: string; top: number } | null = null;
  for (const heading of headings) {
    const headingTop = heading.getBoundingClientRect().top;
    if (headingTop <= 0 && (best === null || headingTop > best.top)) {
      best = { id: heading.id, top: headingTop };
    }
  }

  if (!best) {
    // User scrolled past the post's top but before any heading rendered.
    // Anchor to post-top with the actual offset from post-top to viewport-top.
    return { anchorId: TOP_ANCHOR, fineOffsetPx: -postRect.top };
  }

  return {
    anchorId: best.id,
    fineOffsetPx: Math.max(0, -best.top),
  };
}

/**
 * Read the per-post scroll memory from history.state first, then sessionStorage.
 * history.state is the source of truth for back/forward; sessionStorage backs
 * up across hard refreshes.
 */
export function readScrollMemory(): ScrollMemory {
  if (typeof window === "undefined") {
    return {};
  }
  const fromHistory = (
    window.history.state as { scrollByPostId?: unknown } | null
  )?.scrollByPostId;
  if (fromHistory && typeof fromHistory === "object") {
    return fromHistory as ScrollMemory;
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ScrollMemory) : {};
  } catch {
    return {};
  }
}

/**
 * Replace the current history entry's scrollByPostId and mirror to sessionStorage.
 * Caller must preserve other fields (stackIds) — this merges into history.state.
 */
export function writeScrollMemory(memory: ScrollMemory): void {
  if (typeof window === "undefined") {
    return;
  }
  const prev = (window.history.state ?? {}) as Record<string, unknown>;
  try {
    window.history.replaceState(
      { ...prev, scrollByPostId: memory },
      "",
      window.location.href
    );
  } catch {
    // history.replaceState can fail in sandboxed contexts; silently fall through.
  }
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(memory));
  } catch {
    // Quota exceeded or storage disabled; sessionStorage is best-effort.
  }
}

/**
 * Merge a single post's anchor into persisted memory.
 * Passing null removes the entry (e.g., after dismissal).
 */
export function persistAnchorForPost(
  postId: string,
  anchor: AnchorState | null
): void {
  const memory = readScrollMemory();
  if (anchor === null) {
    delete memory[postId];
  } else {
    memory[postId] = anchor;
  }
  writeScrollMemory(memory);
}

/**
 * Restore the user's reading position within `postId` to `anchor`. Caller is
 * responsible for ensuring the post element is mounted and layout-stable
 * (use `waitForPostStable` from scroll-utils).
 *
 * Returns true if the heading anchor was found and applied; false if it fell
 * back to top of post.
 */
export function restoreAnchorForPost(
  postId: string,
  anchor: AnchorState
): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const postEl = document.querySelector(
    postSelector(postId)
  ) as HTMLElement | null;
  if (!postEl) {
    return false;
  }

  if (anchor.anchorId === TOP_ANCHOR) {
    const top = Math.max(
      0,
      postEl.getBoundingClientRect().top +
        window.scrollY +
        anchor.fineOffsetPx
    );
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    return true;
  }

  // Scope query to the post element so duplicate heading ids across posts
  // resolve to the right post's heading.
  const anchorEl = postEl.querySelector<HTMLElement>(
    `#${CSS.escape(anchor.anchorId)}`
  );
  if (!anchorEl) {
    // Anchor removed (post edited between visits). Land at top of post.
    const top = Math.max(
      0,
      postEl.getBoundingClientRect().top + window.scrollY
    );
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    return false;
  }

  const anchorTop = anchorEl.getBoundingClientRect().top + window.scrollY;
  // Clamp so a shrunk post can't dump the user past its end into the next post.
  const postBottom = postEl.getBoundingClientRect().bottom + window.scrollY;
  const maxScroll = Math.max(0, postBottom - window.innerHeight);
  const target = Math.min(
    maxScroll,
    Math.max(0, anchorTop + anchor.fineOffsetPx)
  );
  window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  return true;
}
