"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { ActorRefFrom } from "xstate";
import type { PostStackMachine } from "@/lib/post-stack-machine";
import {
  readScrollMemory,
  type ScrollMemory,
} from "@/lib/post-stack-utils-client";
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
  posts: _posts,
  currentStackIds,
  isLoadingNewPost,
  isRootPage: _isRootPage,
  scrollState,
}: UseUrlManagementProps) {
  const router = useRouter();
  const isInternalUpdateRef = useRef(false);
  const lastPushedRef = useRef<string | null>(null);
  const pendingStackIdsRef = useRef<string[] | null>(null);

  /**
   * Update URL based on current application state.
   *
   * Preserves any scrollByPostId payload already in history.state so that
   * subsequent back-navigation restores anchors captured before this push.
   */
  const updateUrl = useCallback(
    (stackIds: string[]) => {
      if (isLoadingNewPost || isInternalUpdateRef.current) {
        return;
      }

      const newState = urlStateManager.updateState(stackIds);

      if (urlStateManager.shouldUpdateUrl()) {
        const newUrl = urlStateManager.getUrlForState(newState);

        // Defer pushing while a programmatic scroll is animating; flush on idle.
        if (scrollState && scrollState === "programmaticScroll") {
          pendingStackIdsRef.current = stackIds;
          return;
        }

        if (lastPushedRef.current === newUrl) {
          return;
        }
        try {
          const prev = (window.history.state ?? {}) as Record<string, unknown>;
          const scrollByPostId =
            (prev.scrollByPostId as ScrollMemory | undefined) ?? {};
          window.history.pushState({ stackIds, scrollByPostId }, "", newUrl);
        } catch {
          router.push(newUrl, { scroll: false });
        }
        lastPushedRef.current = newUrl;
        pendingStackIdsRef.current = null;
      }
    },
    [router, isLoadingNewPost, urlStateManager, scrollState]
  );

  /**
   * Handle browser back/forward.
   *
   * Reads stackIds from history.state (set on every pushState) and dispatches
   * BROWSER_NAVIGATION. The machine's cancellingScroll path handles concurrent
   * popstates via scrollOperationId, so the prior 50ms debounce is unnecessary.
   * The anchor restore for the target post is read from history.state inside
   * the provider's scroll executor — this hook just hands off the event.
   */
  const handleBrowserNavigation = useCallback(() => {
    if (isInternalUpdateRef.current) {
      return;
    }
    pendingStackIdsRef.current = null;

    let stackIds: string[];
    if (
      window.history.state?.stackIds &&
      Array.isArray(window.history.state.stackIds)
    ) {
      stackIds = window.history.state.stackIds;
    } else {
      const parsed = urlStateManager.parseUrlState();
      stackIds = parsed.postIds.length > 0 ? parsed.postIds : ["root"];
    }

    isInternalUpdateRef.current = true;
    // Reset push memo so a subsequent forward navigation to the same URL we
    // pushed before isn't suppressed as a duplicate.
    lastPushedRef.current = null;
    actor.send({
      type: "BROWSER_NAVIGATION",
      stackIds,
      direction: "forward",
    });
    Promise.resolve().then(() => {
      isInternalUpdateRef.current = false;
    });
  }, [actor, urlStateManager]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Seed initial history.state if missing (first page load). Preserve any
    // existing scrollByPostId from sessionStorage backup.
    if (!window.history.state?.stackIds) {
      const parsed = urlStateManager.parseUrlState();
      const initialStackIds =
        parsed.postIds.length > 0 ? parsed.postIds : ["root"];
      window.history.replaceState(
        { stackIds: initialStackIds, scrollByPostId: readScrollMemory() },
        "",
        window.location.href
      );
    }

    window.addEventListener("popstate", handleBrowserNavigation);
    return () => {
      window.removeEventListener("popstate", handleBrowserNavigation);
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

  // Flush any URL push deferred during programmatic scroll once the machine settles.
  useEffect(() => {
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
