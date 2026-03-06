"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type PostStackHydrationGuardProps = {
  children: ReactNode;
  serverPostOriginalIds: string[];
  fallback?: ReactNode;
};

/**
 * PostStackHydrationGuard prevents double-rendering during hydration
 * by ensuring client-side content only renders after server content is stable.
 *
 * This specifically fixes the issue where grouped findings posts would
 * temporarily show duplicate content during the hydration process.
 */
export function PostStackHydrationGuard({
  children,
  serverPostOriginalIds,
  fallback = null,
}: PostStackHydrationGuardProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [serverContentStable, setServerContentStable] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Mark as hydrated immediately
    setIsHydrated(true);

    // Monitor server content for stability
    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) {
      setServerContentStable(true);
      return;
    }

    let mutationCount = 0;
    const maxMutations = 10; // Limit the number of mutations we care about

    // Create a mutation observer to detect when server content stops changing
    observerRef.current = new MutationObserver((mutations) => {
      // Only care about significant mutations
      const significantMutations = mutations.filter((mutation) => {
        if (mutation.type === "childList") {
          // Only count mutations that add/remove actual post elements
          const hasPostElements =
            Array.from(mutation.addedNodes).some(
              (node) =>
                node instanceof Element &&
                (node.matches("[data-post-id], [data-post-index]") ||
                  node.querySelector("[data-post-id], [data-post-index]"))
            ) ||
            Array.from(mutation.removedNodes).some(
              (node) =>
                node instanceof Element &&
                (node.matches("[data-post-id], [data-post-index]") ||
                  node.querySelector("[data-post-id], [data-post-index]"))
            );
          return hasPostElements;
        }
        return false;
      });

      if (significantMutations.length === 0) {
        return; // Ignore non-significant mutations
      }

      mutationCount += significantMutations.length;

      // Reset the timeout each time a mutation occurs
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a timeout to mark content as stable after mutations stop
      timeoutRef.current = setTimeout(() => {
        setServerContentStable(true);
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      }, 100); // Reduced to 100ms for faster response

      // If too many mutations, assume content is stable
      if (mutationCount >= maxMutations) {
        setServerContentStable(true);
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      }
    });

    // Start observing with reduced sensitivity
    observerRef.current.observe(postsContainer, {
      childList: true,
      subtree: true,
      attributes: false, // Reduce sensitivity to attribute changes - no attributeFilter when attributes is false
    });

    // Shorter fallback timeout
    const fallbackTimeout = setTimeout(() => {
      setServerContentStable(true);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }, 500); // Reduced to 500ms fallback

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Additional check: ensure server posts are actually in DOM
  useEffect(() => {
    if (!(isHydrated && serverContentStable)) {
      return;
    }

    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) {
      return;
    }

    // Verify that server posts are actually rendered in DOM
    const serverPostsInDom = serverPostOriginalIds.every((originalId) => {
      const element = postsContainer.querySelector(
        `[data-post-id="${originalId}"]`
      );
      return element !== null;
    });

    if (!serverPostsInDom) {
      // Brief delay to allow server content to fully render
      const retryTimeout = setTimeout(() => {
        setServerContentStable(true);
      }, 100);

      return () => clearTimeout(retryTimeout);
    }
  }, [isHydrated, serverContentStable, serverPostOriginalIds]);

  // Only render children when both hydration is complete AND server content is stable
  const shouldRenderChildren = isHydrated && serverContentStable;

  if (!shouldRenderChildren) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
