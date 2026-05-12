"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ActorRefFrom } from "xstate";
import { findPostIndex } from "@/lib/post-stack-helpers";
import type { PostStackMachine } from "@/lib/post-stack-machine";
import {
  ScrollCancelledError,
  scrollToElement,
  waitForPostElement,
} from "@/lib/scroll-utils";
import type { RenderedPost } from "@/types/post";

interface UseScrollManagementProps {
  actor: ActorRefFrom<PostStackMachine>;
  articleRefs: React.RefObject<(HTMLElement | null)[]>;
  currentStackIds: string[];
  posts: RenderedPost[];
  scrollOperationId?: number;
  setArticleRef: (index: number, element: HTMLElement | null) => void;
}

export function useScrollManagement({
  posts,
  actor,
  articleRefs,
  setArticleRef,
  currentStackIds,
  scrollOperationId,
}: UseScrollManagementProps) {
  const pendingScrollRef = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    },
    []
  );

  const scrollToPost = useCallback(
    async (
      postId: string,
      skipStateUpdate = false,
      expectedPostIds?: string[]
    ): Promise<void> => {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      const postIndex = findPostIndex(posts, postId);
      if (postIndex === -1) {
        return;
      }

      const _targetPost = posts[postIndex];

      // DEBUG: Check ref state before scroll
      const _currentRef = articleRefs.current[postIndex];

      try {
        // Track programmatic scroll timing for observer guards
        (
          window as unknown as { __lastProgrammaticScrollTime?: number }
        ).__lastProgrammaticScrollTime = Date.now();

        // Only send SCROLL_TO_POST if not skipping state update (for programmatic scrolls)
        if (!skipStateUpdate) {
          actor.send({ type: "SCROLL_TO_POST", postId });
        }

        // Wait for the post element to be available in DOM
        let postElement: HTMLElement;
        try {
          postElement = await waitForPostElement(postId, postIndex);
        } catch {
          // Try to use the ref if available as fallback
          const refElement = articleRefs.current[postIndex];
          if (refElement && document.contains(refElement)) {
            postElement = refElement;
          } else {
            const pollForElement = async (
              attempts = 15,
              delayMs = 80
            ): Promise<HTMLElement | null> => {
              for (let i = 0; i < attempts; i++) {
                const byId = document.querySelector(
                  `[data-post-id="${postId}"]`
                ) as HTMLElement | null;
                const byIndex =
                  typeof postIndex === "number"
                    ? (document.querySelector(
                        `[data-post-index="${postIndex}"]`
                      ) as HTMLElement | null)
                    : null;
                const el = byId || byIndex;
                if (el && el.offsetHeight > 0) {
                  return el;
                }
                await new Promise((res) => setTimeout(res, delayMs));
              }
              return null;
            };
            const polled = await pollForElement();
            if (polled) {
              postElement = polled;
            } else {
              actor.send({ type: "SCROLL_COMPLETE" });
              return;
            }
          }
        }

        // Check if we have a valid ref, if not use the element we found
        const refElement = articleRefs.current[postIndex];

        // CRITICAL FIX: Validate that the ref actually matches the post we want
        // Don't use a ref that has the wrong post ID!
        let targetElement = postElement; // Default to what we found

        // Clear any stale ref first
        if (refElement && document.contains(refElement)) {
          const refPostId = refElement.getAttribute("data-post-id");
          if (refPostId === postId) {
            // Ref is valid and matches our target post
            targetElement = refElement;
          } else {
            // Ref is stale - clear it immediately
            setArticleRef(postIndex, null);
          }
        }

        // Re-query for the element to ensure we have the most up-to-date reference
        const freshElement = document.querySelector(
          `[data-post-id="${postId}"]`
        ) as HTMLElement;

        if (freshElement && freshElement.offsetHeight > 0) {
          targetElement = freshElement;
          // Update the ref with the fresh element
          if (targetElement !== refElement) {
            setArticleRef(postIndex, targetElement);
          }
        }

        // Final validation: ensure element is visible and correct
        const finalPostId = targetElement.getAttribute("data-post-id");
        const _finalPostIndex = targetElement.getAttribute("data-post-index");

        if (finalPostId !== postId || targetElement.offsetHeight === 0) {
          // Element is not valid, wait for DOM to stabilize
          await new Promise((resolve) => requestAnimationFrame(resolve));

          // Try one more time after animation frame
          const lastAttempt = document.querySelector(
            `[data-post-id="${postId}"]`
          ) as HTMLElement;

          if (lastAttempt && lastAttempt.offsetHeight > 0) {
            targetElement = lastAttempt;
            setArticleRef(postIndex, targetElement);
          }
        }

        // Perform the scroll to exact element position
        await scrollToElement(targetElement, expectedPostIds);

        // Send scroll complete event to state machine with operation ID
        actor.send({ type: "SCROLL_COMPLETE", operationId: scrollOperationId });
      } catch (error) {
        // Check if this is just a cancelled scroll (not a real error)
        if (error instanceof ScrollCancelledError) {
          // This is expected behavior when navigating quickly, no need to log as error
        } else {
          // Unexpected error during scroll, but continue to prevent stuck state
        }
        // Send scroll complete even on error to prevent stuck state
        actor.send({ type: "SCROLL_COMPLETE", operationId: scrollOperationId });
      }
    },
    [actor, posts, articleRefs, setArticleRef, scrollOperationId]
  );

  return {
    scrollToPost,
    pendingScrollRef,
  };
}
