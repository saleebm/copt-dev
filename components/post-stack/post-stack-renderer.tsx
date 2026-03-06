"use client";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import { getCurrentPostIndex } from "@/lib/post-stack-helpers";
import { PostArticle } from "./post-article";
import { PostStackHydrationGuard } from "./post-stack-hydration-guard";
import { PostStackLoading } from "./post-stack-loading";

type PostStackRendererProps = {
  serverPostOriginalIds: string[];
  isHydrated: boolean;
};

/**
 * Focused component for portal rendering with smooth transitions
 * Handles client-only post rendering with proper ref coordination
 * Now uses context directly instead of prop drilling
 */
export const PostStackRenderer: React.FC<PostStackRendererProps> = ({
  serverPostOriginalIds,
  isHydrated,
}) => {
  const { posts, isLoadingNewPost, dismissingInfo } = usePostStackState();
  // Note: setArticleRef and getArticleRef are available but not used in this component
  // Ref registration is handled inside PostCard/section via setArticleRef directly

  const serverPostOriginalIdsSet = useMemo(
    () => new Set(serverPostOriginalIds),
    [serverPostOriginalIds]
  );

  // Filter client-only posts - only include posts not in server set
  const clientOnlyPosts = useMemo(() => {
    return posts.filter((post) => {
      // Skip if dismissing
      if (post.id === dismissingInfo?.id) {
        return false;
      }

      // Skip if already rendered by server
      // This is the ONLY check needed - the server posts are definitively known
      if (serverPostOriginalIdsSet.has(post.originalId)) {
        return false;
      }
      return true;
    });
  }, [posts, serverPostOriginalIdsSet, dismissingInfo?.id]);

  // Ref registration is handled inside PostCard/section via setArticleRef.
  // Avoid registering refs on wrapper elements to prevent data-post-id mismatches.

  // Don't render anything before hydration
  if (!isHydrated) {
    return null;
  }

  const postsContainer = document.getElementById("posts-container");
  if (!postsContainer) {
    return null;
  }

  return createPortal(
    <PostStackHydrationGuard
      fallback={null}
      serverPostOriginalIds={serverPostOriginalIds}
    >
      {/* Loading indicator */}
      <PostStackLoading
        isLoading={!!isLoadingNewPost}
        loadingPostId={isLoadingNewPost}
      />

      {/* Client-only posts with smooth motion animations */}
      <AnimatePresence>
        {(() => null)()}
        {clientOnlyPosts.map((post) => {
          const actualIndex = getCurrentPostIndex(
            posts,
            post.id,
            undefined,
            "PostStackRenderer client render"
          );

          if (actualIndex === -1) {
            return null;
          }
          return (
            <motion.div
              key={`client-post-${post.id}`}
              layout={false}
              style={{
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
                transform: "translate3d(0,0,0)",
              }}
            >
              <PostArticle index={actualIndex} keyPrefix="client" post={post} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </PostStackHydrationGuard>,
    postsContainer
  );
};
