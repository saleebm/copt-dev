/**
 * Centralized State Synchronization Hook
 *
 * DEPRECATED: This hook is being phased out in favor of use-url-management.ts
 * which now handles all URL-related state management including popstate listeners.
 */

"use client";

import { useCallback } from "react";
import type { ActorRefFrom } from "xstate";
import type { PostStackMachine } from "@/lib/post-stack-machine";
import type { UrlStateManager } from "@/lib/url-state-manager";
import type { RenderedPost } from "@/types/post";

type UseCentralizedStateSyncProps = {
  actor: ActorRefFrom<PostStackMachine>;
  urlStateManager: UrlStateManager;
  posts: RenderedPost[];
  currentStackIds: string[];
  isLoadingNewPost: string | null;
  isRootPage: boolean;
};

/**
 * DEPRECATED: This hook is now a no-op
 * All functionality has been moved to use-url-management.ts
 */
export function useCentralizedStateSync({
  actor,
  urlStateManager,
  posts,
  currentStackIds,
  isLoadingNewPost,
  isRootPage,
}: UseCentralizedStateSyncProps) {
  /**
   * No-op functions to maintain API compatibility
   */
  const updateUrl = useCallback(() => {
    // NO-OP: Functionality moved to use-url-management.ts
  }, []);

  const goHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  return {
    updateUrl,
    goHome,
    urlStateManager,
  };
}
