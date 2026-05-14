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
  const { addPost } = usePostStackActions();
  const { scrollState, isProgrammaticScroll } = usePostStackState();
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

  useEffect(() => {
    if (scrollState === "programmaticScroll") {
      wasScrollingRef.current = true;
    }
  }, [scrollState]);

  useEffect(() => {
    if (scrollState !== "idle" || isProgrammaticScroll) {
      return;
    }
    if (wasScrollingRef.current) {
      wasScrollingRef.current = false;
      onNavigate?.();
    }
    lastClickedIdRef.current = null;
  }, [scrollState, isProgrammaticScroll, onNavigate]);

  return {
    handleClickId,
    handleClickPostObj,
  };
}
