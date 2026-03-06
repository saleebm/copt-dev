/**
 * Centralized URL State Manager
 *
 * Single source of truth for all post stack navigation state.
 * Eliminates race conditions and ensures URL <-> state consistency.
 */

import { DEFAULT_POST_ID } from "@/lib/constants";
import { parseCurrentUrl } from "@/lib/post-stack-utils-client";
import type { RenderedPost } from "@/types/post";

export type NavigationState = {
  postIds: string[]; // Canonical post IDs from URL
  activePostId: string | null; // Currently active post
  isRootPage: boolean; // Whether we're on home route
  source: "url" | "state" | "default";
};

export type NavigationDirection = {
  direction: "forward" | "backward" | "replace";
  fromStack: string[];
  toStack: string[];
  addedPosts: string[];
  removedPosts: string[];
};

/**
 * Centralized URL State Manager Class
 * Provides single source of truth for navigation state
 */
export class UrlStateManager {
  private _currentState: NavigationState;
  private _previousState: NavigationState | null = null;
  private _isUpdating = false;

  constructor(isRootPage: boolean, initialPostIds?: string[]) {
    this._currentState = {
      postIds: initialPostIds || [DEFAULT_POST_ID],
      activePostId:
        initialPostIds?.[initialPostIds.length - 1] || DEFAULT_POST_ID,
      isRootPage,
      source: initialPostIds ? "state" : "default",
    };
  }

  /**
   * Get current navigation state
   */
  getCurrentState(): NavigationState {
    return { ...this._currentState };
  }

  /**
   * Parse current URL and return normalized state
   */
  parseUrlState(): NavigationState {
    if (typeof window === "undefined") {
      return this._currentState;
    }

    const parsed = parseCurrentUrl(this._currentState.isRootPage);

    return {
      postIds: parsed.postIds,
      activePostId: parsed.postIds.at(-1) || null,
      isRootPage: this._currentState.isRootPage,
      source: "url",
    };
  }

  /**
   * Sync state with current URL (called during browser navigation)
   */
  syncWithUrl(): NavigationDirection {
    const urlState = this.parseUrlState();
    const direction = this._calculateDirection(
      this._currentState.postIds,
      urlState.postIds
    );

    this._previousState = { ...this._currentState };
    this._currentState = urlState;

    return direction;
  }

  /**
   * Update state from application (called during user interactions)
   */
  updateState(
    newPostIds: string[],
    activePostId: string | null = null
  ): NavigationState {
    if (this._isUpdating) {
      return this._currentState;
    }

    const resolvedActivePostId = activePostId || newPostIds.at(-1) || null;

    this._previousState = { ...this._currentState };
    this._currentState = {
      ...this._currentState,
      postIds: [...newPostIds],
      activePostId: resolvedActivePostId,
      source: "state",
    };

    return this._currentState;
  }

  /**
   * Get URL string for current state
   */
  getUrlForState(state: NavigationState = this._currentState): string {
    if (state.postIds.length === 0) {
      return state.isRootPage ? "/" : "/root";
    }

    if (state.isRootPage) {
      // Home route: all posts in search params
      const params = new URLSearchParams();
      if (state.postIds.length > 0) {
        params.set("stack", state.postIds.join(","));
      }
      return `/?${params.toString()}`;
    }
    // Catch-all route: first post in path, rest in search params
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const additionalPosts = state.postIds.filter(
      (id) => !pathSegments.includes(id)
    );

    if (additionalPosts.length > 0) {
      const params = new URLSearchParams();
      params.set("stack", additionalPosts.join(","));
      return `${window.location.pathname}?${params.toString()}`;
    }

    return window.location.pathname;
  }

  /**
   * Check if we need to update URL
   */
  shouldUpdateUrl(): boolean {
    if (this._isUpdating || typeof window === "undefined") {
      return false;
    }

    const currentUrl = window.location.pathname + window.location.search;
    const expectedUrl = this.getUrlForState();

    return currentUrl !== expectedUrl;
  }

  /**
   * Mark as updating to prevent cycles
   */
  setUpdating(updating: boolean): void {
    this._isUpdating = updating;
  }

  /**
   * Get posts that need to be loaded from cache
   */
  getPostsToLoad(postCache: RenderedPost[]): {
    postsToRender: RenderedPost[];
    missingPostIds: string[];
  } {
    const postsToRender: RenderedPost[] = [];
    const missingPostIds: string[] = [];

    for (const postId of this._currentState.postIds) {
      const cachedPost = postCache.find((p) => p.originalId === postId);
      if (cachedPost) {
        postsToRender.push(cachedPost);
      } else {
        missingPostIds.push(postId);
      }
    }

    return { postsToRender, missingPostIds };
  }

  /**
   * Calculate navigation direction and changes
   */
  private _calculateDirection(
    fromStack: string[],
    toStack: string[]
  ): NavigationDirection {
    const addedPosts = toStack.filter((id) => !fromStack.includes(id));
    const removedPosts = fromStack.filter((id) => !toStack.includes(id));

    let direction: "forward" | "backward" | "replace";

    if (addedPosts.length > 0 && removedPosts.length === 0) {
      direction = "forward";
    } else if (addedPosts.length === 0 && removedPosts.length > 0) {
      direction = "backward";
    } else {
      direction = "replace";
    }

    return {
      direction,
      fromStack: [...fromStack],
      toStack: [...toStack],
      addedPosts,
      removedPosts,
    };
  }

  /**
   * Get state for debugging
   */
  getDebugInfo() {
    return {
      current: this._currentState,
      previous: this._previousState,
      isUpdating: this._isUpdating,
      currentUrl: typeof window !== "undefined" ? window.location.href : "SSR",
    };
  }
}

/**
 * Hook to use URL state manager
 */
export function createUrlStateManager(
  isRootPage: boolean,
  initialPostIds?: string[]
): UrlStateManager {
  return new UrlStateManager(isRootPage, initialPostIds);
}
