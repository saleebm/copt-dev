"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import { PostStackObserver } from "./post-stack-observer";
import { PostStackRenderer } from "./post-stack-renderer";
import { PostStackStyling } from "./post-stack-styling";

interface PostStackInteractiveProps {
  serverPostOriginalIds: string[];
}

/**
 * Coordinator component that orchestrates post stack interactivity
 * Simplified architecture using context directly instead of prop drilling
 */
const PostStackInteractive: React.FC<PostStackInteractiveProps> = ({
  serverPostOriginalIds,
}) => {
  const { activePostId, scrollState } = usePostStackState();
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration guard - critical for preventing hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Don't render anything before hydration
  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {/* Portal rendering with smooth transitions and loading states */}
      <PostStackRenderer
        isHydrated={isHydrated}
        serverPostOriginalIds={serverPostOriginalIds}
      />

      {/* Intersection observer for scroll tracking - now uses context directly */}
      <PostStackObserver isHydrated={isHydrated} />

      {/* Active post styling - coordinated with scroll state */}
      <PostStackStyling
        activePostId={activePostId}
        isHydrated={isHydrated}
        scrollState={scrollState}
      />
    </>
  );
};

export default PostStackInteractive;
