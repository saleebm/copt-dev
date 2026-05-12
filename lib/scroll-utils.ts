/**
 * Scroll utilities for deterministic post navigation.
 *
 * Event-driven primitives:
 * - `waitForScrollEnd`: native `scrollend` (Chrome 114+, Safari 17+, Firefox 109+),
 *   with a 100ms `scroll`-debounce polyfill and a 1.5s safety cap.
 * - `waitForPostStable`: MutationObserver to detect element appearance, then
 *   ResizeObserver to detect layout stability (two consecutive rAFs without a
 *   resize callback). 2s hard cap.
 * - `scrollToElement`: composes the above into a programmatic scroll that
 *   resolves only when the browser has actually settled.
 */

export type ScrollState =
  | "idle"
  | "programmaticScroll"
  | "userInteraction"
  | "settling";

/**
 * Signal that a scroll was cancelled. Not a real error — callers should swallow.
 */
export class ScrollCancelledError extends Error {
  constructor(message = "Scroll cancelled") {
    super(message);
    this.name = "ScrollCancelledError";
  }
}

// Single in-flight scroll. Replacing controllers cancels prior animations.
let currentScrollController: AbortController | null = null;

export function cancelCurrentScroll() {
  if (currentScrollController) {
    currentScrollController.abort();
    currentScrollController = null;
  }
}

const SCROLLEND_SAFETY_CAP_MS = 1500;
const SCROLL_POLYFILL_QUIESCE_MS = 100;
const POST_STABLE_CAP_MS = 2000;
const STABLE_FRAMES_REQUIRED = 2;

function supportsScrollEnd(): boolean {
  return typeof window !== "undefined" && "onscrollend" in window;
}

/**
 * Resolve when the browser fires `scrollend` for the window. On browsers
 * without `scrollend`, resolve 100ms after the last `scroll` event (or
 * immediately if no scroll fires within 100ms). Capped at 1.5s.
 *
 * Honors an optional AbortSignal — aborts reject with ScrollCancelledError.
 */
export function waitForScrollEnd(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ScrollCancelledError("Scroll cancelled before wait"));
      return;
    }

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
      window.removeEventListener("scrollend", handleScrollEnd);
      window.removeEventListener("scroll", handleScroll);
      signal?.removeEventListener("abort", handleAbort);
    };

    function handleAbort() {
      cleanup();
      reject(new ScrollCancelledError("Scroll cancelled during wait"));
    }

    function handleScrollEnd() {
      cleanup();
      resolve();
    }

    function handleScroll() {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      scrollTimer = setTimeout(() => {
        cleanup();
        resolve();
      }, SCROLL_POLYFILL_QUIESCE_MS);
    }

    signal?.addEventListener("abort", handleAbort);

    if (supportsScrollEnd()) {
      window.addEventListener("scrollend", handleScrollEnd, { once: true });
    } else {
      // Polyfill: resolve after scroll quiesces, or right away if already at rest.
      window.addEventListener("scroll", handleScroll, { passive: true });
      scrollTimer = setTimeout(() => {
        cleanup();
        resolve();
      }, SCROLL_POLYFILL_QUIESCE_MS);
    }

    // Ultimate safety cap. The OS or the browser sometimes drops scrollend
    // (e.g., target removed mid-animation). Never block the machine forever.
    safetyTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, SCROLLEND_SAFETY_CAP_MS);
  });
}

/**
 * Wait for an element matching `selector` to exist AND have a stable layout.
 *
 * Stability = ResizeObserver fires once on observe (initial size), then two
 * consecutive animation frames pass with no further resize callback.
 *
 * Uses MutationObserver to detect element appearance — no polling, no
 * exponential backoff. Hard cap 2s for pathological cases (e.g., target post
 * removed before render).
 */
export function waitForPostStable(
  selector: string,
  signal?: AbortSignal
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ScrollCancelledError("Wait cancelled before start"));
      return;
    }

    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let pendingRaf: number | null = null;
    let stableFrames = 0;
    let safety: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      if (pendingRaf !== null) {
        cancelAnimationFrame(pendingRaf);
      }
      if (safety) {
        clearTimeout(safety);
      }
      signal?.removeEventListener("abort", handleAbort);
    };

    function handleAbort() {
      cleanup();
      reject(new ScrollCancelledError("Wait cancelled during stabilize"));
    }
    signal?.addEventListener("abort", handleAbort);

    safety = setTimeout(() => {
      const fallback = document.querySelector(selector) as HTMLElement | null;
      cleanup();
      if (fallback && fallback.offsetHeight > 0) {
        resolve(fallback);
      } else {
        reject(
          new Error(
            `Element not stable within ${POST_STABLE_CAP_MS}ms: ${selector}`
          )
        );
      }
    }, POST_STABLE_CAP_MS);

    const startStability = (el: HTMLElement) => {
      mutationObserver?.disconnect();
      mutationObserver = null;

      const schedule = () => {
        if (pendingRaf !== null) {
          return;
        }
        pendingRaf = requestAnimationFrame(() => {
          pendingRaf = null;
          stableFrames += 1;
          if (stableFrames >= STABLE_FRAMES_REQUIRED) {
            cleanup();
            resolve(el);
          } else {
            schedule();
          }
        });
      };

      resizeObserver = new ResizeObserver(() => {
        // Any size change resets the stable-frame counter.
        stableFrames = 0;
        if (pendingRaf !== null) {
          cancelAnimationFrame(pendingRaf);
          pendingRaf = null;
        }
        schedule();
      });
      resizeObserver.observe(el);
      schedule();
    };

    const tryFind = (): boolean => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el && el.offsetHeight > 0) {
        startStability(el);
        return true;
      }
      return false;
    };

    if (tryFind()) {
      return;
    }

    mutationObserver = new MutationObserver(() => {
      tryFind();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-post-id", "data-post-index"],
    });
  });
}

/**
 * Wait for a specific post's section element to mount and stabilize.
 * Selectors are scoped to `[data-post-id]` plus an optional index hint.
 */
export async function waitForPostElement(
  postId: string,
  postIndex?: number,
  signal?: AbortSignal
): Promise<HTMLElement> {
  // Most specific selector first when an index is provided.
  if (typeof postIndex === "number" && postIndex >= 0) {
    const indexed = `[data-post-id="${postId}"][data-post-index="${postIndex}"]`;
    const existing = document.querySelector(indexed) as HTMLElement | null;
    if (existing && existing.offsetHeight > 0) {
      return await waitForPostStable(indexed, signal);
    }
  }
  return await waitForPostStable(`[data-post-id="${postId}"]`, signal);
}

/**
 * Smoothly scrolls to an element and resolves when the scroll truly ends.
 *
 * No polling, no exponential backoff, no manufactured settling delay.
 */
export async function scrollToElement(
  element: HTMLElement | null,
  _expectedPostIds?: string[]
): Promise<void> {
  if (!element) {
    throw new Error("Cannot scroll to null element");
  }

  cancelCurrentScroll();
  currentScrollController = new AbortController();
  const signal = currentScrollController.signal;

  if (signal.aborted) {
    throw new ScrollCancelledError("Scroll cancelled before start");
  }

  // Wait for layout to be stable on the target post before reading its position.
  // The post may have just mounted and still be expanding (image/code-block load).
  const targetSelector = element.getAttribute("data-post-id")
    ? `[data-post-id="${element.getAttribute("data-post-id")}"]`
    : null;
  let target: HTMLElement = element;
  if (targetSelector) {
    try {
      target = await waitForPostStable(targetSelector, signal);
    } catch (error) {
      if (error instanceof ScrollCancelledError) {
        throw error;
      }
      // Fall back to the element we were given — the safety cap fired, but the
      // element is still likely scrollable. Better to attempt than to bail.
      target = element;
    }
  }

  if (signal.aborted) {
    throw new ScrollCancelledError("Scroll cancelled after stabilize");
  }

  const targetTop = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY
  );

  window.scrollTo({ top: targetTop, behavior: "smooth" });

  try {
    await waitForScrollEnd(signal);
  } catch (error) {
    if (error instanceof ScrollCancelledError) {
      throw error;
    }
    throw error;
  }

  // Corrective snap if browser landed off-target (rare; happens when content
  // shifts during the smooth-scroll animation).
  const drift = Math.abs(window.scrollY - targetTop);
  if (drift > 5) {
    window.scrollTo({ top: targetTop, behavior: "auto" });
  }

  if (currentScrollController?.signal === signal) {
    currentScrollController = null;
  }
}

/**
 * Returns the index of the post element most prominently in view.
 *
 * Scoring blends header visibility, total visibility, and viewport-center
 * proximity. The header weight biases toward "what the user is reading from
 * the top" rather than "what mostly fills the screen."
 */
export function getMostVisiblePostIndex(
  articleRefs: (HTMLElement | null)[]
): number | null {
  let mostVisibleIndex: number | null = null;
  let highestScore = 0;

  const isSmallScreen = window.innerWidth < 768;
  const scrollMargin = isSmallScreen ? 80 : 60;

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
      top: scrollMargin,
      bottom: window.innerHeight,
    };

    const visibleTop = Math.max(rect.top, viewport.top);
    const visibleBottom = Math.min(rect.bottom, viewport.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const elementHeight = rect.height;

    if (elementHeight === 0) {
      return;
    }

    const visibilityRatio = visibleHeight / elementHeight;

    const headerHeight = Math.min(200, elementHeight * 0.3);
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

    const adjustedCenterY = (viewport.top + viewport.bottom) / 2;
    const elementCenterY = (rect.top + rect.bottom) / 2;
    const distanceFromCenter = Math.abs(elementCenterY - adjustedCenterY);
    const maxDistance = (viewport.bottom - viewport.top) / 2;
    const centerScore = Math.max(0, 1 - distanceFromCenter / maxDistance);

    const combinedScore =
      headerVisibilityRatio * 0.4 + visibilityRatio * 0.3 + centerScore * 0.3;

    const isSubstantiallyVisible =
      visibilityRatio > 0.1 || headerVisibilityRatio > 0.5;

    if (isSubstantiallyVisible && combinedScore > highestScore) {
      mostVisibleIndex = originalIndex;
      highestScore = combinedScore;
    }
  });
  return mostVisibleIndex;
}
