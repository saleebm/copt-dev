"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { ActorRefFrom } from "xstate";
import type { PostStackMachine } from "@/lib/post-stack-machine";
import type { UrlStateManager } from "@/lib/url-state-manager";
import type { RenderedPost } from "@/types/post";

interface UseUrlManagementProps {
  actor: ActorRefFrom<PostStackMachine>;
  currentStackIds: string[];
  isLoadingNewPost: string | null;
  isRootPage: boolean;
  posts: RenderedPost[];
  // Gate URL updates during programmatic scroll to prevent top-jump
  scrollState?: "idle" | "programmaticScroll" | "userInteraction" | "settling";
  urlStateManager: UrlStateManager;
}

export function useUrlManagement({
  actor,
  urlStateManager,
  posts,
  currentStackIds,
  isLoadingNewPost,
  isRootPage,
  scrollState,
}: UseUrlManagementProps) {
  const router = useRouter();
  const isInternalUpdateRef = useRef(false);
  const lastPushedRef = useRef<string | null>(null);
  const pendingStackIdsRef = useRef<string[] | null>(null);
  const lastBrowserNavTimestampRef = useRef<number>(0);
  const popstateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update URL based on current application state
   */
  const updateUrl = useCallback(
    (stackIds: string[]) => {
      if (isLoadingNewPost || isInternalUpdateRef.current) {
        return;
      }

      // Guard: Don't push URLs within 500ms of browser navigation to prevent race conditions
      const timeSinceLastBrowserNav =
        Date.now() - lastBrowserNavTimestampRef.current;
      if (timeSinceLastBrowserNav < 500) {
        return;
      }

      // Simple: just update URL state and push if needed
      const newState = urlStateManager.updateState(stackIds);

      if (urlStateManager.shouldUpdateUrl()) {
        const newUrl = urlStateManager.getUrlForState(newState);

        // Gate push during programmatic scroll to avoid browser scroll reset
        // Only block during active programmatic scroll, not during settling
        if (scrollState && scrollState === "programmaticScroll") {
          pendingStackIdsRef.current = stackIds;
          return;
        }

        // Avoid redundant pushes
        const urlKey = newUrl;
        if (lastPushedRef.current === urlKey) {
          return;
        }
        try {
          // Avoid Next.js rerender to preserve scroll and DOM stability
          // Store stackIds in history state for accurate forward/back navigation
          window.history.pushState({ stackIds }, "", newUrl);
        } catch {
          router.push(newUrl, { scroll: false });
        }
        lastPushedRef.current = urlKey;
        pendingStackIdsRef.current = null;
      }
    },
    [router, isLoadingNewPost, urlStateManager, scrollState]
  );

  /**
   * Handle browser navigation (back/forward buttons)
   *
   * This is triggered by popstate event and ensures state machine
   * synchronizes with the URL (which is the source of truth)
   */
  const handleBrowserNavigation = useCallback(() => {
    // Guard against re-entrant calls during internal updates
    if (isInternalUpdateRef.current) {
      return;
    }

    // Clear any existing debounce timer
    if (popstateDebounceRef.current) {
      clearTimeout(popstateDebounceRef.current);
    }

    // Debounce rapid popstate events (e.g., multiple forward navigations)
    // This prevents scroll cancellation when browser fires multiple events
    popstateDebounceRef.current = setTimeout(() => {
      // Record timestamp to prevent URL updates immediately after browser nav
      lastBrowserNavTimestampRef.current = Date.now();

      // Clear any pending URL updates - browser navigation is the source of truth
      pendingStackIdsRef.current = null;

      // First check if we have stackIds in history.state (more reliable for forward/back)
      // This avoids timing issues where popstate fires before URL updates
      let stackIds: string[];

      if (
        window.history.state?.stackIds &&
        Array.isArray(window.history.state.stackIds)
      ) {
        stackIds = window.history.state.stackIds;
      } else {
        // Fallback to parsing URL (for initial page load or external navigation)
        const parsed = urlStateManager.parseUrlState();
        stackIds = parsed.postIds.length > 0 ? parsed.postIds : ["root"];
      }

      // Mark as internal update to prevent URL re-updates
      isInternalUpdateRef.current = true;

      // Send browser navigation event to state machine
      // The state machine will handle updating posts, scroll targets, etc.
      actor.send({
        type: "BROWSER_NAVIGATION",
        stackIds,
        direction: "forward", // Direction is determined by state machine based on stack comparison
      });

      // Clear internal update flag after a microtask
      // This ensures all synchronous state updates complete first
      Promise.resolve().then(() => {
        isInternalUpdateRef.current = false;
      });

      // Clear the debounce ref
      popstateDebounceRef.current = null;
    }, 50); // 50ms debounce - enough to catch rapid events but still feel responsive
  }, [actor, urlStateManager]);

  /**
   * Handle browser navigation events
   */
  useEffect(() => {
    // Set manual scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Set initial history state if not present (for initial page load)
    if (!window.history.state?.stackIds) {
      const parsed = urlStateManager.parseUrlState();
      const initialStackIds =
        parsed.postIds.length > 0 ? parsed.postIds : ["root"];
      window.history.replaceState(
        { stackIds: initialStackIds },
        "",
        window.location.href
      );
    }

    // Add popstate listener
    window.addEventListener("popstate", handleBrowserNavigation);

    return () => {
      window.removeEventListener("popstate", handleBrowserNavigation);
      // Clean up any pending debounce timer
      if (popstateDebounceRef.current) {
        clearTimeout(popstateDebounceRef.current);
        popstateDebounceRef.current = null;
      }
    };
  }, [handleBrowserNavigation, urlStateManager]);

  /**
   * Sync state changes with URL
   */
  useEffect(() => {
    if (isLoadingNewPost || isInternalUpdateRef.current) {
      return;
    }
    updateUrl(currentStackIds);
  }, [currentStackIds, updateUrl, isLoadingNewPost]);

  // When scrolling settles/returns to idle, flush any pending URL update
  useEffect(() => {
    // Flush pending URL updates when scroll is not actively running
    if (!scrollState || scrollState === "programmaticScroll") {
      return;
    }

    if (pendingStackIdsRef.current) {
      updateUrl(pendingStackIdsRef.current);
    }
  }, [scrollState, updateUrl]);

  const goHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  return {
    updateUrl,
    goHome,
    urlStateManager,
  };
}
