"use client";
import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { getMostVisiblePostIndex } from "@/lib/scroll-utils";

interface PostStackObserverProps {
  isHydrated: boolean;
}

/**
 * Focused component for intersection observer logic
 * Now uses context directly to avoid stale closure issues
 * Optimized with memo to prevent unnecessary re-renders
 */
export const PostStackObserver: React.FC<PostStackObserverProps> = memo(
  ({ isHydrated }) => {
    const {
      posts,
      isInitialLoad,
      activePostId,
      scrollState,
      dismissingInfo,
      isProgrammaticScroll,
    } = usePostStackState();
    const { setActivePost, getArticleRefs, setArticleRef } =
      usePostStackActions();

    const observerRef = useRef<IntersectionObserver | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const manualCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivePostRef = useRef<string | null>(null);
    const retryCountRef = useRef<number>(0);

    // CRITICAL: Use refs to track current state without triggering re-renders
    // This prevents the observer from being recreated on every state change
    const scrollStateRef = useRef<string>(scrollState);
    const isProgrammaticScrollRef = useRef<boolean>(isProgrammaticScroll);

    // Track the last active post to avoid redundant updates
    useEffect(() => {
      lastActivePostRef.current = activePostId;
    }, [activePostId]);

    // Update refs whenever props change - this allows us to access current values
    // without causing the observer effect to re-run
    useEffect(() => {
      scrollStateRef.current = scrollState;
      isProgrammaticScrollRef.current = isProgrammaticScroll;
    }, [scrollState, isProgrammaticScroll]);

    // Manual visibility check function with retry limit
    const performManualVisibilityCheck = useCallback(
      (maxRetries = 5) => {
        // Critical guard: Only run during idle state and not during programmatic scrolls
        // Use refs to get current state without stale closure issues
        if (
          scrollStateRef.current !== "idle" ||
          isProgrammaticScrollRef.current
        ) {
          return;
        }

        if (!isHydrated || isInitialLoad) {
          return;
        }

        const articleRefs = getArticleRefs();

        // Ensure we have the expected number of refs before proceeding
        const expectedRefsCount = posts.length;
        const validRefsCount = articleRefs.filter((ref) => ref !== null).length;

        if (articleRefs.length === 0) {
          retryCountRef.current = 0; // Reset retry counter
          return;
        }

        // If we don't have all expected refs, try to find missing ones
        if (validRefsCount < expectedRefsCount) {
          // Check if we've exceeded maximum retries
          if (retryCountRef.current >= maxRetries) {
            retryCountRef.current = 0; // Reset retry counter

            // Proceed with available refs if we have at least one
            if (validRefsCount > 0) {
              const mostVisibleIndex = getMostVisiblePostIndex(articleRefs);
              if (
                mostVisibleIndex !== null &&
                mostVisibleIndex < posts.length
              ) {
                const mostVisiblePost = posts[mostVisibleIndex];
                if (
                  mostVisiblePost &&
                  mostVisiblePost.id !== lastActivePostRef.current
                ) {
                  setActivePost(mostVisiblePost.id);
                }
              }
            }
            return;
          }
          let foundMissingRefs = false;

          for (let i = 0; i < expectedRefsCount; i++) {
            if (!articleRefs[i]) {
              const missingElement = document.querySelector(
                `section[data-post-index="${i}"]`
              ) as HTMLElement;
              if (missingElement) {
                setArticleRef(i, missingElement);
                foundMissingRefs = true;
              }
            }
          }

          // If we found and registered missing refs, get fresh refs and continue
          if (foundMissingRefs) {
            // Get fresh refs after registration
            const freshArticleRefs = getArticleRefs();
            const freshValidRefsCount = freshArticleRefs.filter(
              (ref) => ref !== null
            ).length;

            if (freshValidRefsCount < expectedRefsCount) {
              retryCountRef.current += 1;
              setTimeout(() => {
                performManualVisibilityCheck(maxRetries);
              }, 100);
              return;
            }
            // Successfully found all refs, reset counter and proceed
            retryCountRef.current = 0;
          } else {
            // No missing refs found, but still don't have all expected refs
            // This might indicate a timing issue or DOM structure problem
            retryCountRef.current += 1;
            if (retryCountRef.current < maxRetries) {
              setTimeout(() => {
                performManualVisibilityCheck(maxRetries);
              }, 100);
              return;
            }
            retryCountRef.current = 0;
          }
        } else {
          // All expected refs are available, reset retry counter
          retryCountRef.current = 0;
        }

        const mostVisibleIndex = getMostVisiblePostIndex(articleRefs);

        if (mostVisibleIndex !== null && mostVisibleIndex < posts.length) {
          const mostVisiblePost = posts[mostVisibleIndex];
          if (
            mostVisiblePost &&
            mostVisiblePost.id !== lastActivePostRef.current
          ) {
            setActivePost(mostVisiblePost.id);
          }
        }
        // No most visible index found - keep current active post
      },
      [
        posts,
        isHydrated,
        isInitialLoad,
        getArticleRefs,
        setArticleRef,
        setActivePost,
      ]
    );

    // Listen for scroll events but respect XState scroll state
    useEffect(() => {
      const handleScrollEnd = () => {
        // Clear any existing manual check timer
        if (manualCheckTimerRef.current) {
          clearTimeout(manualCheckTimerRef.current);
        }

        // Only perform manual check when in idle state and not during programmatic scrolls
        // Use refs to get current state
        if (
          scrollStateRef.current === "idle" &&
          !isProgrammaticScrollRef.current
        ) {
          manualCheckTimerRef.current = setTimeout(() => {
            performManualVisibilityCheck();
          }, 150);
        }
      };

      window.addEventListener("scroll", handleScrollEnd, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScrollEnd);
        if (manualCheckTimerRef.current) {
          clearTimeout(manualCheckTimerRef.current);
        }
      };
    }, [performManualVisibilityCheck]);

    useEffect(() => {
      if (!isHydrated || posts.length === 0) {
        return;
      }

      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // CRITICAL FIX: Don't even create the observer if we're in programmatic scroll
      // This prevents ANY possibility of the observer firing during navigation
      // Use refs to get current state
      if (
        isProgrammaticScrollRef.current ||
        scrollStateRef.current !== "idle"
      ) {
        return; // Exit early - don't create observer at all
      }

      // Create optimized intersection observer
      observerRef.current = new IntersectionObserver(
        (_entries) => {
          // Additional safety check using refs for current state
          if (
            scrollStateRef.current !== "idle" ||
            isProgrammaticScrollRef.current
          ) {
            return;
          }

          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Skip during initial load
          if (isInitialLoad) {
            return;
          }

          debounceTimerRef.current = setTimeout(() => {
            // Use refs to get current state without stale closure issues
            const currentScrollState = scrollStateRef.current;
            const currentProgrammaticScroll = isProgrammaticScrollRef.current;

            // ENHANCED CRITICAL GUARDS: Multiple layers of protection against race conditions

            // Guard 1: Basic state checks
            if (currentScrollState !== "idle" || currentProgrammaticScroll) {
              return;
            }

            // Guard 2: Check if we're still in initial load
            if (isInitialLoad) {
              return;
            }

            // Guard 3: DOM-based state validation - check if any programmatic scroll indicators exist
            const domScrollState =
              document.documentElement.getAttribute("data-scroll-state");
            const domProgrammaticScroll =
              document.documentElement.getAttribute(
                "data-programmatic-scroll"
              ) === "true";

            if (domScrollState !== "idle" || domProgrammaticScroll) {
              return;
            }

            // Guard 4: Check if we're in a stable state (not mid-transition)
            // This is more reliable than time-based checks
            const isStableState =
              currentScrollState === "idle" && !currentProgrammaticScroll;
            if (!isStableState) {
              // Schedule a retry when we might be stable
              setTimeout(() => {
                // Re-check state and perform manual visibility check if stable
                if (
                  scrollStateRef.current === "idle" &&
                  !isProgrammaticScrollRef.current
                ) {
                  performManualVisibilityCheck();
                }
              }, 200);

              return;
            }

            // Guard 5: Check if there's been recent programmatic activity (backup guard)
            const lastProgrammaticTime =
              (window as unknown as { __lastProgrammaticScrollTime?: number })
                .__lastProgrammaticScrollTime || 0;
            const recentProgrammaticActivity =
              Date.now() - lastProgrammaticTime < 300; // Reduced from 1000ms
            if (recentProgrammaticActivity) {
              return;
            }

            const articleRefs = getArticleRefs();
            if (articleRefs.length === 0) {
              return;
            }

            // Prefer a stable host element over SECTION if available
            const fixedRefs = articleRefs.map((ref) => {
              if (!ref) {
                return null;
              }
              // If the ref is a SECTION inside a wrapper, use the wrapper for positioning consistency
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

            const mostVisibleIndex = getMostVisiblePostIndex(fixedRefs);

            if (mostVisibleIndex !== null && mostVisibleIndex < posts.length) {
              const mostVisiblePost = posts[mostVisibleIndex];

              // Guard 6: Final validation before changing active post
              if (
                mostVisiblePost &&
                mostVisiblePost.id !== lastActivePostRef.current
              ) {
                // One more state check right before making the change
                const finalScrollState = scrollStateRef.current;
                const finalProgrammaticScroll = isProgrammaticScrollRef.current;

                if (finalScrollState !== "idle" || finalProgrammaticScroll) {
                  return;
                }
                setActivePost(mostVisiblePost.id);
              }
            } else {
              // Fallback: if we can't determine visibility, try first visible post
              const firstVisibleIndex = articleRefs.findIndex((ref) => {
                if (!ref) {
                  return false;
                }
                const rect = ref.getBoundingClientRect();
                return rect.top < window.innerHeight && rect.bottom > 60;
              });
              if (
                firstVisibleIndex !== -1 &&
                firstVisibleIndex < posts.length
              ) {
                const fallbackPost = posts[firstVisibleIndex];
                if (
                  fallbackPost &&
                  fallbackPost.id !== lastActivePostRef.current
                ) {
                  // Apply same final guards to fallback
                  const finalScrollState = scrollStateRef.current;
                  const finalProgrammaticScroll =
                    isProgrammaticScrollRef.current;

                  if (finalScrollState !== "idle" || finalProgrammaticScroll) {
                    return;
                  }
                  setActivePost(fallbackPost.id);
                }
              }
            }
          }, 150);
        },
        {
          root: null,
          // Enhanced rootMargin for better detection of large content
          rootMargin: "-60px 0px -5% 0px",
          // More granular thresholds for better detection
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
        }
      );

      // Observe only current non-dismissed post elements
      const currentPostIds = posts
        .filter((post) => post.id !== dismissingInfo?.id) // Exclude dismissing posts
        .map((post) => post.id);

      const articleElements: HTMLElement[] = [];

      // Find elements for current posts only
      currentPostIds.forEach((postId, _index) => {
        const element = document.querySelector(
          `[data-post-id="${postId}"]`
        ) as HTMLElement;
        if (element) {
          articleElements.push(element);
        }
      });

      articleElements.forEach((element) => {
        if (observerRef.current) {
          observerRef.current.observe(element);
        }
      });

      // Cleanup function
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        if (manualCheckTimerRef.current) {
          clearTimeout(manualCheckTimerRef.current);
        }
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [
      posts,
      isInitialLoad,
      isHydrated,
      setActivePost,
      getArticleRefs,
      dismissingInfo?.id,
      performManualVisibilityCheck,
    ]);

    // Cleanup on unmount
    useEffect(
      () => () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        if (manualCheckTimerRef.current) {
          clearTimeout(manualCheckTimerRef.current);
        }
      },
      []
    );

    return null; // This component only manages side effects
  }
);

PostStackObserver.displayName = "PostStackObserver";
