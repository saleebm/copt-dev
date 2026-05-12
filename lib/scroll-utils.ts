/**
 * Scroll utilities for deterministic post navigation
 * Replaces setTimeout-based guessing with event-driven approach
 */

export type ScrollState =
  | "idle"
  | "programmaticScroll"
  | "userInteraction"
  | "settling";

/**
 * Custom error class for cancelled scrolls
 * This is not a real error, just a signal that the scroll was intentionally cancelled
 */
export class ScrollCancelledError extends Error {
  constructor(message = "Scroll cancelled") {
    super(message);
    this.name = "ScrollCancelledError";
  }
}

// Global scroll cancellation controller to prevent overlapping animations
let currentScrollController: AbortController | null = null;

/**
 * Cancels any in-progress scroll animation
 * Critical for preventing race conditions during rapid browser navigation
 */
export function cancelCurrentScroll() {
  if (currentScrollController) {
    currentScrollController.abort();
    currentScrollController = null;
  }
}

/**
 * Tracks whether scrolling was initiated by user or programmatically
 */
class ScrollOriginTracker {
  private programmaticScrolling = false;
  private userScrollTimer: NodeJS.Timeout | null = null;

  markProgrammaticScroll() {
    this.programmaticScrolling = true;
    // Clear any existing timer
    if (this.userScrollTimer) {
      clearTimeout(this.userScrollTimer);
    }
    // Auto-reset after scroll should complete
    this.userScrollTimer = setTimeout(() => {
      this.programmaticScrolling = false;
    }, 2000);
  }

  isUserScrolling(): boolean {
    return !this.programmaticScrolling;
  }

  reset() {
    this.programmaticScrolling = false;
    if (this.userScrollTimer) {
      clearTimeout(this.userScrollTimer);
      this.userScrollTimer = null;
    }
  }
}

export const scrollOriginTracker = new ScrollOriginTracker();

/**
 * Waits for scroll animation to complete using scrollend event
 */
export function waitForScrollEnd(): Promise<void> {
  return new Promise((resolve) => {
    // Simple fallback: detect when scrolling stops
    let scrollTimer: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        window.removeEventListener("scroll", handleScroll);
        resolve();
      }, 100);
    };
    window.addEventListener("scroll", handleScroll);
  });
}

/**
 * Waits for DOM element to be ready and visible
 */
export function waitForElementReady(
  element: HTMLElement | null
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(new Error("Element not found"));
      return;
    }

    // If element is already ready, resolve immediately
    if (element.offsetHeight > 0 && element.offsetWidth > 0) {
      resolve(element);
      return;
    }

    // Use MutationObserver to wait for element to be ready
    const observer = new MutationObserver(() => {
      if (element.offsetHeight > 0 && element.offsetWidth > 0) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Timeout as fallback
    setTimeout(() => {
      observer.disconnect();
      if (element.offsetHeight > 0 && element.offsetWidth > 0) {
        resolve(element);
      } else {
        reject(new Error("Element not ready within timeout"));
      }
    }, 3000);
  });
}

/**
 * Waits for DOM to be in consistent state by checking expected posts are rendered
 */
function ensureDOMConsistency(
  expectedPostIds: string[],
  maxRetries = 50
): Promise<void> {
  return new Promise((resolve) => {
    let retryCount = 0;
    let lastCheckTime = Date.now();

    const checkDOMState = () => {
      const now = Date.now();
      const _timeSinceLastCheck = now - lastCheckTime;
      lastCheckTime = now;

      // Use top-level containers only to avoid duplicates from nested elements
      const actualPostElements = document.querySelectorAll("[data-post-index]");
      const actualPostIds = Array.from(actualPostElements)
        .map((el) => el.getAttribute("data-post-id"))
        .filter(Boolean) as string[];
      const uniqueActual = Array.from(new Set(actualPostIds));

      // Check if DOM matches expected state
      if (
        expectedPostIds.length === uniqueActual.length &&
        expectedPostIds.every((id) => uniqueActual.includes(id))
      ) {
        resolve();
        return;
      }

      // Increment retry counter
      retryCount++;

      // Check if we've exceeded max retries
      if (retryCount >= maxRetries) {
        resolve();
        return;
      }

      // Exponential backoff: wait longer between retries
      const delay = Math.min(100 * 1.2 ** retryCount, 1000);

      // If not ready, try again after delay
      setTimeout(() => {
        requestAnimationFrame(checkDOMState);
      }, delay);
    };

    checkDOMState();
  });
}

/**
 * Waits for layout to be stable using ResizeObserver
 */
function waitForLayoutStability(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    // Track stable dimensions
    let lastWidth = element.offsetWidth;
    let lastHeight = element.offsetHeight;
    let stabilityCount = 0;
    const requiredStableFrames = 2; // Need 2 consecutive stable frames

    const checkStability = () => {
      const currentWidth = element.offsetWidth;
      const currentHeight = element.offsetHeight;

      if (currentWidth === lastWidth && currentHeight === lastHeight) {
        stabilityCount++;
        if (stabilityCount >= requiredStableFrames) {
          // Layout is stable
          resolve();
          return;
        }
      } else {
        // Dimensions changed, reset counter
        stabilityCount = 0;
        lastWidth = currentWidth;
        lastHeight = currentHeight;
      }

      // Check again on next frame
      requestAnimationFrame(checkStability);
    };

    // Start checking
    checkStability();

    // Fallback timeout to prevent infinite waiting
    setTimeout(() => {
      resolve(); // Resolve anyway after max wait time
    }, 1000);
  });
}

/**
 * Gets the absolute document position of an element using offsetTop
 * This is more reliable than getBoundingClientRect for scrolling
 */
function getAbsolutePosition(element: HTMLElement): number {
  // Use offsetTop for absolute positioning relative to the document
  // This is more stable than getBoundingClientRect which is viewport-relative
  let top = 0;
  let currentElement: HTMLElement | null = element;

  // Walk up the offset parent chain to get absolute position
  while (currentElement && currentElement !== document.body) {
    top += currentElement.offsetTop;
    currentElement = currentElement.offsetParent as HTMLElement;
  }

  return top;
}

/**
 * Smoothly scrolls to an element and waits for completion
 * Uses offset-based positioning for accuracy and layout stability detection
 */
export async function scrollToElement(
  element: HTMLElement | null,
  expectedPostIds?: string[]
): Promise<void> {
  if (!element) {
    throw new Error("Cannot scroll to null element");
  }

  // Cancel any in-progress scroll animation to prevent overlapping
  cancelCurrentScroll();

  // Create new abort controller for this scroll
  currentScrollController = new AbortController();
  const signal = currentScrollController.signal;

  // Mark this as programmatic scrolling and track timing for observer guards
  scrollOriginTracker.markProgrammaticScroll();
  (
    window as unknown as { __lastProgrammaticScrollTime?: number }
  ).__lastProgrammaticScrollTime = Date.now();

  // If expected post IDs provided, ensure DOM consistency first
  if (expectedPostIds && expectedPostIds.length > 0) {
    await ensureDOMConsistency(expectedPostIds);
  }
  // Wait for element to be ready first
  const readyElement = await waitForElementReady(element);
  await waitForLayoutStability(readyElement);

  // Use multiple rAFs to ensure all layout updates are complete
  // This accounts for React Portal rendering and browser layout cycles
  return new Promise((resolve, reject) => {
    // Check if aborted before starting
    if (signal.aborted) {
      reject(new ScrollCancelledError("Scroll cancelled before start"));
      return;
    }

    // Double rAF pattern ensures we're past all React render cycles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Check if aborted during scroll setup
        if (signal.aborted) {
          reject(new ScrollCancelledError("Scroll cancelled during setup"));
          return;
        }

        try {
          // Debug: Log current DOM state
          const _allPostElements = document.querySelectorAll(
            "[data-post-id], [data-post-index]"
          );

          // Use absolute positioning instead of viewport-relative
          const targetScrollY = getAbsolutePosition(readyElement);

          // Ensure we don't scroll below 0
          const finalScrollY = Math.max(0, targetScrollY);

          // Perform scroll with smooth behavior
          window.scrollTo({
            top: finalScrollY,
            behavior: "smooth",
          });

          // Wait for scroll to complete with abort signal
          const abortHandler = () => {
            reject(new ScrollCancelledError());
          };

          signal.addEventListener("abort", abortHandler);

          waitForScrollEnd()
            .then(() => {
              signal.removeEventListener("abort", abortHandler);

              // Check if aborted after completion
              if (signal.aborted) {
                reject(
                  new ScrollCancelledError("Scroll cancelled after completion")
                );
                return;
              }

              const actualFinalPosition = window.scrollY;
              const difference = Math.abs(actualFinalPosition - finalScrollY);

              // Verify we're at the right position
              if (difference > 5) {
                // Corrective snap to ensure we land precisely at the target post
                window.scrollTo({ top: finalScrollY, behavior: "auto" });
              }

              // Clear the controller after successful completion
              currentScrollController = null;
              resolve();
            })
            .catch((error) => {
              signal.removeEventListener("abort", abortHandler);
              currentScrollController = null;
              reject(error);
            });
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

/**
 * Gets the index of the most visible post element with improved accuracy
 * Enhanced for large content posts with better scoring algorithm
 */
export function getMostVisiblePostIndex(
  articleRefs: (HTMLElement | null)[]
): number | null {
  let mostVisibleIndex: number | null = null;
  let highestScore = 0;

  const isSmallScreen = window.innerWidth < 768;
  const scrollMargin = isSmallScreen ? 80 : 60;

  // Create a map of original indices to valid refs
  const validRefsWithIndices: Array<{
    element: HTMLElement;
    originalIndex: number;
  }> = [];

  articleRefs.forEach((ref, index) => {
    if (!ref) {
      return;
    }
    validRefsWithIndices.push({ element: ref, originalIndex: index });
  });

  if (validRefsWithIndices.length === 0) {
    return null;
  }

  validRefsWithIndices.forEach(({ element, originalIndex }) => {
    const rect = element.getBoundingClientRect();
    const viewport = {
      top: scrollMargin, // Account for scroll margin
      bottom: window.innerHeight,
    };

    // Calculate how much of the element is visible
    const visibleTop = Math.max(rect.top, viewport.top);
    const visibleBottom = Math.min(rect.bottom, viewport.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const elementHeight = rect.height;

    if (elementHeight === 0) {
      return;
    }

    const visibilityRatio = visibleHeight / elementHeight;

    // Enhanced scoring for large content posts
    // Check if the post's header/top portion is prominently visible
    const headerHeight = Math.min(200, elementHeight * 0.3); // Header is top 30% or max 200px
    const headerVisibleTop = Math.max(rect.top, viewport.top);
    const headerVisibleBottom = Math.min(
      rect.top + headerHeight,
      viewport.bottom
    );
    const headerVisibleHeight = Math.max(
      0,
      headerVisibleBottom - headerVisibleTop
    );
    const headerVisibilityRatio = headerVisibleHeight / headerHeight;

    // Prefer posts that are more centered in the adjusted viewport
    const adjustedCenterY = (viewport.top + viewport.bottom) / 2;
    const elementCenterY = (rect.top + rect.bottom) / 2;
    const distanceFromCenter = Math.abs(elementCenterY - adjustedCenterY);
    const maxDistance = (viewport.bottom - viewport.top) / 2;
    const centerScore = Math.max(0, 1 - distanceFromCenter / maxDistance);

    // Enhanced scoring algorithm for large content:
    // 40% header visibility + 30% overall visibility + 30% center position
    const combinedScore =
      headerVisibilityRatio * 0.4 + visibilityRatio * 0.3 + centerScore * 0.3;

    // Lower threshold for large content posts - prioritize header visibility
    const isSubstantiallyVisible =
      visibilityRatio > 0.1 || headerVisibilityRatio > 0.5;

    if (isSubstantiallyVisible && combinedScore > highestScore) {
      mostVisibleIndex = originalIndex;
      highestScore = combinedScore;
    }
  });
  return mostVisibleIndex;
}

/**
 * Debug utility to monitor scroll behavior
 */
export function logScrollState() {
  // Intentionally empty - reserved for future debugging
}

/**
 * Waits for a specific post element using MutationObserver (fallback method)
 */
function waitForPostElementWithObserver(
  postId: string,
  postIndex?: number
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const selectors: string[] = [
      // original-id selector removed
      `section[data-post-id="${postId}"]`,
      `[data-post-id="${postId}"]`,
      `article[data-post-id="${postId}"]`,
    ];

    if (typeof postIndex === "number" && postIndex >= 0) {
      selectors.unshift(`section[data-post-index="${postIndex}"]`);
      selectors.unshift(`[data-post-index="${postIndex}"]`);
    }

    // Check if element already exists (final check)
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetHeight > 0) {
        resolve(element);
        return;
      }
    }

    // Extended timeout for complex navigation scenarios
    const timeout = setTimeout(() => {
      if (observer) {
        observer.disconnect();
      }
      reject(
        new Error(`Post element not found with observer after 5s: ${postId}`)
      );
    }, 5000); // Increased from 3s to 5s

    // Create a wrapper resolve function that cleans up the timeout
    const resolveWithCleanup = (element: HTMLElement) => {
      clearTimeout(timeout);
      if (observer) {
        observer.disconnect();
      }
      resolve(element);
    };

    // Use MutationObserver to wait for element
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          for (const selector of selectors) {
            const element = document.querySelector(selector) as HTMLElement;
            if (element && element.offsetHeight > 0) {
              resolveWithCleanup(element);
              return;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true, // Also watch for attribute changes
      attributeFilter: ["data-post-id", "data-post-index"],
    });
  });
}

/**
 * Waits for a specific post element to be available in the DOM
 * Enhanced with exponential backoff for better reliability
 */
export async function waitForPostElement(
  postId: string,
  postIndex?: number,
  retries = 8
): Promise<HTMLElement> {
  // Enhanced selectors - prioritize wrapper DIV elements for accurate scroll positioning
  const createSelectors = (id: string) => [
    // Wrapper DIVs with both attributes (most reliable for scrolling)
    `#posts-container > div[data-post-id="${id}"][data-post-index]`,
    `div[data-post-id="${id}"][data-post-index]`,
    // Generic elements with post ID
    `[data-post-id="${id}"]`,
    // Section elements (have offsetTop=0, less reliable)
    `section[data-post-id="${id}"]`,
    `article[data-post-id="${id}"]`,
  ];

  // First try the quick retry approach with enhanced selectors
  for (let i = 0; i < retries; i++) {
    const selectors = createSelectors(postId);

    // Add index-specific selectors for additional targeting options
    if (typeof postIndex === "number" && postIndex >= 0) {
      // Prioritize wrapper DIV with both index and ID at the start
      selectors.unshift(
        `#posts-container > div[data-post-index="${postIndex}"][data-post-id="${postId}"]`
      );
      selectors.push(
        `div[data-post-index="${postIndex}"][data-post-id="${postId}"]`
      );
      selectors.push(
        `[data-post-index="${postIndex}"][data-post-id="${postId}"]`
      );
    }

    // Debug: Show all post elements currently in DOM
    if (i === 0) {
      const _allPostElements = document.querySelectorAll(
        "[data-post-id], [data-post-index]"
      );
    }

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
        // CRITICAL FIX: If we found a SECTION with offsetTop=0, use its parent DIV instead
        // The posts structure is: DIV[data-post-index] > SECTION[data-post-index]
        // The DIV has the correct offsetTop, the inner SECTION has offsetTop=0
        if (element.tagName === "SECTION" && element.offsetTop === 0) {
          const parentDiv = element.parentElement as HTMLElement;
          // Check if parent has the same data-post-index (it's the wrapper)
          if (
            parentDiv &&
            parentDiv.getAttribute("data-post-index") ===
              element.getAttribute("data-post-index")
          ) {
            return parentDiv;
          }
        }
        return element;
      }
    }

    // Exponential backoff with increased delays for better reliability
    const delay = Math.min(100 * 1.5 ** i, 1000); // Max 1 second delay
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  try {
    return await waitForPostElementWithObserver(postId, postIndex);
  } catch {
    // Don't throw - instead return a fallback or handle gracefully
    // This prevents crashes during navigation
    throw new Error(
      `Post element not found after all attempts: ${postId} (tried ${retries} quick retries + MutationObserver)`
    );
  }
}
