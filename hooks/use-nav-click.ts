"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import type { PostId } from "@/types/post";

/**
 * Composition hook that mirrors Timeline tab's click + settle gating.
 * - Calls addPost(id)
 * - Optionally closes navigation when scroll cycle completes (programmaticScroll → idle)
 */
export function useNavClick(onNavigate?: () => void) {
  const { addPost, scrollToPost } = usePostStackActions();
  const { scrollState, isProgrammaticScroll, activePostId } =
    usePostStackState();
  const lastClickedIdRef = useRef<PostId | null>(null);
  const wasScrollingRef = useRef(false);

  const handleClickId = useCallback(
    async (id: PostId) => {
      try {
        lastClickedIdRef.current = id;
        await addPost(id);
      } catch {
        // Silently handle errors during post addition
      }
    },
    [addPost]
  );

  const handleClickPostObj = useCallback(
    async (post: { id: PostId }) => handleClickId(post.id),
    [handleClickId]
  );

  // Track programmatic scroll so the idle gate below knows a scroll cycle completed.
  useEffect(() => {
    if (scrollState === "programmaticScroll") {
      wasScrollingRef.current = true;
    }
  }, [scrollState]);

  // Verify final alignment when the machine enters settling; no panel close here.
  useEffect(() => {
    // CRITICAL: Don't correct alignment if we're in a programmatic scroll
    // This prevents race conditions when clicking post links
    if (scrollState === "settling" && !isProgrammaticScroll) {
      const id = lastClickedIdRef.current;
      if (!id) {
        return;
      }
      try {
        const el = document.querySelector(
          `[data-post-id="${id}"]`
        ) as HTMLElement | null;
        if (el) {
          let top = 0;
          let node: HTMLElement | null = el;
          while (node && node !== document.body) {
            top += node.offsetTop || 0;
            node = node.offsetParent as HTMLElement | null;
          }
          const diff = Math.abs(window.scrollY - top);
          if (diff > 8) {
            scrollToPost(id, true).catch(() => {
              // Silently handle scroll errors
            });
          } else {
            lastClickedIdRef.current = null;
          }
        }
      } catch {
        // Silently handle DOM access errors
      }
    }
  }, [scrollState, isProgrammaticScroll, scrollToPost]);

  // Additional guard: after URL updates (which can occur when returning to idle),
  // re-check alignment and correct if the browser landed at the top or mismatch > threshold.
  useEffect(() => {
    // CRITICAL: Don't correct alignment if we're in a programmatic scroll
    // This prevents overriding intentional navigation to a different post
    if (scrollState !== "idle" || isProgrammaticScroll) {
      return;
    }

    // Close nav after a completed programmatic scroll cycle (Timeline / Chronicle tabs).
    if (wasScrollingRef.current) {
      wasScrollingRef.current = false;
      onNavigate?.();
    }

    const id = lastClickedIdRef.current;
    if (!id) {
      return;
    }

    // CRITICAL: Check if the ref matches the current active post
    // If not, it means the user navigated to a different post without using nav panel
    // Clear the ref and skip correction to prevent stale corrections
    if (id !== activePostId) {
      lastClickedIdRef.current = null;
      return;
    }

    // Clear the ref when idle to prevent stale corrections
    // This ensures we don't force scrolls based on old navigation
    const clearAndReturn = () => {
      lastClickedIdRef.current = null;
    };

    try {
      const el = document.querySelector(
        `[data-post-id="${id}"]`
      ) as HTMLElement | null;
      if (!el) {
        clearAndReturn();
        return;
      }
      let top = 0;
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        top += node.offsetTop || 0;
        node = node.offsetParent as HTMLElement | null;
      }
      const diff = Math.abs(window.scrollY - top);
      // Correct if clearly off (e.g., browser landed at top or mismatch remains)
      if (diff > 12 || window.scrollY < 4) {
        scrollToPost(id, true).catch(() => {
          // Silently handle scroll errors
        });
      }
      // Clear the ref after checking to prevent future stale corrections
      clearAndReturn();
    } catch {
      clearAndReturn();
    }
  }, [scrollState, isProgrammaticScroll, activePostId, scrollToPost, onNavigate]);

  return {
    handleClickId,
    handleClickPostObj,
  };
}
