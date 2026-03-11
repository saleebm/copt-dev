"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RenderedPost } from "@/types/post";

type ScrollState =
  | "idle"
  | "programmaticScroll"
  | "userInteraction"
  | "settling";

export function useArticleRefs(
  posts: RenderedPost[],
  scrollState: ScrollState = "idle"
) {
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Signal when React hydration is complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const setArticleRef = useCallback(
    (index: number, element: HTMLElement | null) => {
      const currentRef = articleRefs.current[index];

      // Prevent unnecessary null assignments that cause visual flashing
      if (element === null) {
        // Only set to null if the current ref is no longer in the DOM
        if (currentRef && document.contains(currentRef)) {
          return; // Don't nullify a valid ref
        }
      } else if (currentRef === element) {
        return; // Avoid unnecessary re-assignments
      }

      articleRefs.current[index] = element;
    },
    []
  );

  const getArticleRef = useCallback(
    (index: number) => articleRefs.current[index] || null,
    []
  );

  // Keep article refs synced with posts length - IMMEDIATE SYNC
  useEffect(() => {
    const newLength = posts.length;
    const currentLength = articleRefs.current.length;

    if (newLength !== currentLength) {
      if (newLength > currentLength) {
        // Expanding array - fill new slots with null
        const newRefs = [...articleRefs.current];
        for (let i = currentLength; i < newLength; i++) {
          newRefs[i] = null;
        }
        articleRefs.current = newRefs;
      } else if (newLength < currentLength) {
        articleRefs.current = articleRefs.current.slice(0, newLength);

        // Force immediate validation of remaining refs to ensure they match posts
        for (let i = 0; i < newLength; i++) {
          const currentRef = articleRefs.current[i];
          const expectedPost = posts[i];

          if (currentRef && expectedPost) {
            // Verify the ref matches the expected post
            const refPostId = currentRef.getAttribute("data-post-id");

            if (
              refPostId !== expectedPost.id &&
              refPostId !== expectedPost.originalId
            ) {
              articleRefs.current[i] = null;
            }
          } else if (currentRef && !expectedPost) {
            articleRefs.current[i] = null;
          }
        }
      }
    }
    // No posts to clean up
  }, [posts.length, posts]); // Include posts array to trigger on post changes, not just length

  // Enhanced effect to ensure all posts have registered refs
  useEffect(() => {
    if (posts.length === 0) {
      return;
    }

    const registerMissingRefs = () => {
      let foundMissingRefs = false;

      posts.forEach((post, index) => {
        // Check if ref is already registered and still valid
        const existingRef = articleRefs.current[index];
        const isRefValid = existingRef && document.contains(existingRef);

        if (!isRefValid) {
          // Try multiple selectors to find the element, including original ID
          const selectors = [
            `section[data-post-index="${index}"]`,
            `article[data-post-index="${index}"]`,
            `[data-post-index="${index}"]`,
            `section[data-post-id="${post.id}"]`,
            `article[data-post-id="${post.id}"]`,
            `[data-post-id="${post.id}"]`,
            // original-id selectors removed; canonical id only
          ];

          let postElement: HTMLElement | null = null;
          for (const selector of selectors) {
            postElement = document.querySelector(selector) as HTMLElement;
            if (postElement) {
              break;
            }
          }

          if (postElement) {
            // Verify the element is actually valid and not being duplicated
            const _elementIndex = postElement.getAttribute("data-post-index");
            const _elementPostId = postElement.getAttribute("data-post-id");
            const _elementOriginalId = postElement.getAttribute(
              "data-post-original-id"
            );

            setArticleRef(index, postElement);
            foundMissingRefs = true;
          }
          // Post element not found in DOM
        }
      });

      return foundMissingRefs;
    };

    // Initial attempt with a small delay to allow DOM rendering
    const timeoutId = setTimeout(() => {
      const foundMissing = registerMissingRefs();

      if (foundMissing) {
        // If we found missing refs, try again after a short delay to catch any remaining ones
        setTimeout(() => {
          registerMissingRefs();
        }, 100);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [posts.length, posts, setArticleRef]);

  // Additional effect to handle dynamic post additions
  useEffect(() => {
    if (posts.length === 0) {
      return;
    }

    // Use MutationObserver to watch for new post elements being added to the DOM
    const observer = new MutationObserver((mutations) => {
      try {
        // Critical guard: Only run during idle state to prevent hydration race conditions
        if (scrollState !== "idle") {
          return;
        }

        // Do not run the observer's logic if React hasn't hydrated yet
        if (!isHydrated) {
          return;
        }

        let shouldCheckRefs = false;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // Check if this is a post element or contains post elements
                if (
                  element.matches("[data-post-index], [data-post-id]") ||
                  element.querySelector("[data-post-index], [data-post-id]")
                ) {
                  shouldCheckRefs = true;
                }
              }
            });
          }
        });

        if (shouldCheckRefs) {
          // Small delay to ensure the element is fully rendered
          setTimeout(() => {
            try {
              // Double-check state after timeout
              if (scrollState !== "idle") {
                return;
              }

              posts.forEach((_post, index) => {
                try {
                  // Only register if ref is missing or invalid
                  const existingRef = articleRefs.current[index];
                  const isRefValid =
                    existingRef && document.contains(existingRef);

                  if (!isRefValid) {
                    const postElement = document.querySelector(
                      `[data-post-index="${index}"]`
                    ) as HTMLElement;
                    if (postElement) {
                      setArticleRef(index, postElement);
                    }
                  }
                } catch (_error) {
                  // Continue with other posts instead of crashing
                }
              });
            } catch (_error) {
              // Silently handle errors during ref registration retry
            }
          }, 50);
        }
      } catch (_error) {
        // Don't re-throw - let the application continue
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [posts, setArticleRef, isHydrated, scrollState]);

  return {
    setArticleRef,
    getArticleRef,
    articleRefs,
  };
}
