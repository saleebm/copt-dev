"use client";
import type React from "react";
import { memo, useEffect } from "react";

type PostStackStylingProps = {
  activePostId: string | null;
  isHydrated: boolean;
  scrollState?: "idle" | "programmaticScroll" | "userInteraction" | "settling"; // Add scroll state awareness
};

/**
 * Focused component for active post styling
 * Optimized with memo to prevent unnecessary re-renders
 * Now waits for scroll completion before applying styles
 */
export const PostStackStyling: React.FC<PostStackStylingProps> = memo(
  ({ activePostId, isHydrated, scrollState = "idle" }) => {
    useEffect(() => {
      if (!isHydrated) {
        return;
      }

      // Apply styles when scrolling is idle or when we're restoring scroll position
      // Skip only during active programmatic scroll and user interaction states
      if (
        scrollState === "programmaticScroll" ||
        scrollState === "userInteraction"
      ) {
        return;
      }

      // Use requestAnimationFrame and setTimeout to ensure DOM updates are complete
      // This ensures the scroll positioning is finished before we apply styles
      requestAnimationFrame(() => {
        setTimeout(() => {
          const postElements = document.querySelectorAll("[data-post-id]");

          postElements.forEach((element) => {
            const postId = element.getAttribute("data-post-id");
            const isActive = postId === activePostId;

            // Use classList methods for better performance
            if (isActive) {
              element.classList.add("active-post");
            } else {
              element.classList.remove("active-post");
            }
          });
        }, 50); // Small delay to ensure scroll positioning is complete
      });
    }, [activePostId, isHydrated, scrollState]);

    return null; // This component only manages side effects
  }
);

PostStackStyling.displayName = "PostStackStyling";
