"use client";

import { useEffect, useRef } from "react";
import type { PostStackActor } from "@/lib/post-stack-machine";

/**
 * Hook to detect user scroll interruptions during programmatic scrolling
 * Listens for wheel, touchstart, and keydown events to detect when the user
 * is trying to interrupt a programmatic scroll operation
 */
export function useUserScrollInterruption(
  actor: PostStackActor,
  isEnabled = true
) {
  const isDetectingRef = useRef(false);
  const _lastScrollTimeRef = useRef(0);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Get current state to check if we're in programmatic scroll
    const getCurrentState = () => actor.getSnapshot();

    const handleWheelEvent = (_event: WheelEvent) => {
      const snapshot = getCurrentState();

      // During programmatic scroll - interrupt it
      if (snapshot.context.scrollState === "programmaticScroll") {
        // Clear any existing timeout
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }

        // Small delay to avoid triggering on smooth scroll events
        wheelTimeoutRef.current = setTimeout(() => {
          const currentSnapshot = getCurrentState();
          // Double-check we're still in programmatic scroll
          if (currentSnapshot.context.scrollState === "programmaticScroll") {
            actor.send({ type: "USER_INTERACTION" });
          }
        }, 50);
      }
      // In idle state - user is scrolling normally, enable observer
      else if (
        snapshot.context.scrollState === "idle" &&
        snapshot.context.isProgrammaticScroll
      ) {
        actor.send({ type: "ENABLE_OBSERVER" });
      }
    };

    const handleTouchStart = (_event: TouchEvent) => {
      const snapshot = getCurrentState();

      // During programmatic scroll - interrupt it
      if (snapshot.context.scrollState === "programmaticScroll") {
        actor.send({ type: "USER_INTERACTION" });
      }
      // In idle state - user is scrolling normally, enable observer
      else if (
        snapshot.context.scrollState === "idle" &&
        snapshot.context.isProgrammaticScroll
      ) {
        actor.send({ type: "ENABLE_OBSERVER" });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const snapshot = getCurrentState();

      // Only detect scroll-related keys during programmatic scroll
      const scrollKeys = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ];

      if (
        scrollKeys.includes(event.key) &&
        snapshot.context.scrollState === "programmaticScroll"
      ) {
        actor.send({ type: "USER_INTERACTION" });
      }
    };

    // Add event listeners with passive:false for wheel to allow preventDefault if needed
    document.addEventListener("wheel", handleWheelEvent, {
      passive: true,
      capture: true,
    });
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });
    document.addEventListener("keydown", handleKeyDown, {
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener("wheel", handleWheelEvent, {
        capture: true,
      });
      document.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [actor, isEnabled]);

  return {
    isDetecting: isDetectingRef.current,
  };
}
