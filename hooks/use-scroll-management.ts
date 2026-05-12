"use client";

import { useCallback, useRef } from "react";
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
  currentStackIds: _currentStackIds,
  scrollOperationId,
}: UseScrollManagementProps) {
  const pendingScrollRef = useRef<string | null>(null);

  const scrollToPost = useCallback(
    async (postId: string, skipStateUpdate = false): Promise<void> => {
      const postIndex = findPostIndex(posts, postId);
      if (postIndex === -1) {
        return;
      }

      try {
        if (!skipStateUpdate) {
          actor.send({ type: "SCROLL_TO_POST", postId });
        }

        // Resolve the target element. waitForPostElement uses MutationObserver
        // + ResizeObserver internally — no polling, no exponential backoff.
        let targetElement: HTMLElement;
        try {
          targetElement = await waitForPostElement(postId, postIndex);
        } catch {
          // Element didn't stabilize within 2s. Try the cached ref as a last
          // resort; if even that's gone, send completion and bail so the
          // machine never gets stuck.
          const refElement = articleRefs.current[postIndex];
          if (refElement && document.contains(refElement)) {
            targetElement = refElement;
          } else {
            actor.send({ type: "SCROLL_COMPLETE", operationId: scrollOperationId });
            return;
          }
        }

        // Keep the article ref in sync with whatever element we resolved.
        const refElement = articleRefs.current[postIndex];
        if (refElement !== targetElement) {
          setArticleRef(postIndex, targetElement);
        }

        await scrollToElement(targetElement);
        actor.send({ type: "SCROLL_COMPLETE", operationId: scrollOperationId });
      } catch (error) {
        if (error instanceof ScrollCancelledError) {
          // Expected when navigation supersedes an in-flight scroll. Still
          // signal completion so the machine doesn't get stuck.
        }
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
