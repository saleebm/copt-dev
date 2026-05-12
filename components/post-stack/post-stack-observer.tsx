"use client";
import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import {
  captureAnchorForPost,
  persistAnchorForPost,
} from "@/lib/post-stack-utils-client";
import { getMostVisiblePostIndex } from "@/lib/scroll-utils";

interface PostStackObserverProps {
  isHydrated: boolean;
}

function supportsScrollEnd(): boolean {
  return typeof window !== "undefined" && "onscrollend" in window;
}

const SCROLL_POLYFILL_QUIESCE_MS = 100;

/**
 * Tracks which post is most prominent in view and writes back to the machine.
 *
 * Driven by the native `scrollend` event when available; falls back to a
 * 100ms scroll-quiesce debounce on browsers without it. Both are deterministic
 * "user stopped scrolling" signals.
 *
 * Gating:
 * - Bails while the machine is in programmatic scroll. The machine releases
 *   `isProgrammaticScroll` on real SCROLL_COMPLETE, so there's no need for a
 *   time-based grace window.
 * - Bails during initial hydration.
 */
export const PostStackObserver: React.FC<PostStackObserverProps> = memo(
  ({ isHydrated }) => {
    const { posts, activePostId, scrollState, isProgrammaticScroll } =
      usePostStackState();
    const { setActivePost, getArticleRefs } = usePostStackActions();

    const lastActivePostRef = useRef<string | null>(null);
    const scrollStateRef = useRef<string>(scrollState);
    const isProgrammaticScrollRef = useRef<boolean>(isProgrammaticScroll);

    useEffect(() => {
      lastActivePostRef.current = activePostId;
    }, [activePostId]);

    useEffect(() => {
      scrollStateRef.current = scrollState;
      isProgrammaticScrollRef.current = isProgrammaticScroll;
    }, [scrollState, isProgrammaticScroll]);

    const updateActiveFromViewport = useCallback(() => {
      if (
        !isHydrated ||
        scrollStateRef.current !== "idle" ||
        isProgrammaticScrollRef.current
      ) {
        return;
      }

      const articleRefs = getArticleRefs();
      if (articleRefs.length === 0) {
        return;
      }

      // Prefer wrapper element if the ref is on the inner SECTION.
      const resolvedRefs = articleRefs.map((ref) => {
        if (!ref) {
          return null;
        }
        const parent = ref.parentElement as HTMLElement | null;
        if (
          ref.tagName === "SECTION" &&
          parent &&
          parent.hasAttribute("data-post-index")
        ) {
          return parent;
        }
        return ref;
      });

      const mostVisibleIndex = getMostVisiblePostIndex(resolvedRefs);
      if (mostVisibleIndex !== null && mostVisibleIndex < posts.length) {
        const mostVisiblePost = posts[mostVisibleIndex];
        if (mostVisiblePost) {
          // Capture scroll memory for the most-visible post. This must
          // happen here (not in a separate scrollend listener) so the
          // capture key matches what the user is actually reading, not the
          // lagging machine.activePostId during nav transitions.
          const anchor = captureAnchorForPost(mostVisiblePost.id);
          if (anchor) {
            persistAnchorForPost(mostVisiblePost.id, anchor);
          }
          if (mostVisiblePost.id !== lastActivePostRef.current) {
            setActivePost(mostVisiblePost.id);
          }
        }
      }
    }, [posts, isHydrated, getArticleRefs, setActivePost]);

    useEffect(() => {
      if (!isHydrated) {
        return;
      }

      if (supportsScrollEnd()) {
        window.addEventListener("scrollend", updateActiveFromViewport, {
          passive: true,
        });
        return () => {
          window.removeEventListener("scrollend", updateActiveFromViewport);
        };
      }

      // Polyfill: trigger after the user has been still for 100ms.
      let quiesceTimer: ReturnType<typeof setTimeout> | null = null;
      const handleScroll = () => {
        if (quiesceTimer) {
          clearTimeout(quiesceTimer);
        }
        quiesceTimer = setTimeout(() => {
          quiesceTimer = null;
          updateActiveFromViewport();
        }, SCROLL_POLYFILL_QUIESCE_MS);
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (quiesceTimer) {
          clearTimeout(quiesceTimer);
        }
      };
    }, [isHydrated, updateActiveFromViewport]);

    return null;
  }
);

PostStackObserver.displayName = "PostStackObserver";
