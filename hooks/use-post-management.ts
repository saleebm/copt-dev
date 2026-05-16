"use client";

import { serialize } from "next-mdx-remote/serialize";
import { useCallback, useEffect, useRef } from "react";
import type { ActorRefFrom } from "xstate";
import { getPostDetailsAction } from "@/app/actions";
import { getMDXComponents } from "@/components/mdx-components";
import { ensurePostIdInvariant } from "@/lib/invariants";
import {
  mdxRehypePlugins,
  mdxRemarkPlugins,
  stripMdxHtmlComments,
} from "@/lib/mdx-options";
import { createPostContent } from "@/lib/post-content-factory";
import {
  findPostById,
  validateAndCorrectIndex,
} from "@/lib/post-stack-helpers";
import type { PostStackMachine } from "@/lib/post-stack-machine";
import type { PostData, PostId, RenderedPost } from "@/types/post";

interface UsePostManagementProps {
  activePostId: string | null;
  actor: ActorRefFrom<PostStackMachine>;
  currentStackIds: string[];
  dismissingInfo: { id: string } | null;
  goHome: () => void;
  posts: RenderedPost[];
  setActivePost: (postId: string | null) => void;
  updateUrl: (stackIds: string[]) => void;
}

export function usePostManagement({
  actor,
  posts,
  dismissingInfo,
  goHome,
  updateUrl,
  currentStackIds,
  activePostId: _activePostId,
  setActivePost: _setActivePost,
}: UsePostManagementProps) {
  // Add refs to store timeout IDs
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to clear timeouts
  const clearTimeouts = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Clear timeouts on unmount
  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  const addPost = useCallback(
    async (originalPostIdToAdd: PostId) => {
      // DEFENSIVE CHECK: Get current state from actor to ensure consistency
      const currentSnapshot = actor.getSnapshot();
      const currentPosts = currentSnapshot.context.posts;

      // Enhanced duplicate prevention - check both props and actor state
      const propsDuplicate = findPostById(posts, originalPostIdToAdd);
      const stateDuplicate = findPostById(currentPosts, originalPostIdToAdd);

      if (propsDuplicate || stateDuplicate) {
        const existingPost = propsDuplicate || stateDuplicate;
        const isDismissing = dismissingInfo?.id === existingPost?.id;

        if (existingPost && !isDismissing) {
          actor.send({ type: "ADD_POST", originalPostId: originalPostIdToAdd });
          return;
        }
      }

      // FIRST: Check if we can add a post (check for duplicates BEFORE state machine events)
      // Look for existing posts with the same originalId that aren't being dismissed
      const existingPost = findPostById(posts, originalPostIdToAdd);
      const existingPostIndex =
        existingPost && dismissingInfo?.id !== existingPost.id
          ? posts.findIndex((p) => p.id === existingPost.id)
          : -1;

      if (existingPostIndex !== -1) {
        const _existingPost = posts[existingPostIndex];
        actor.send({ type: "ADD_POST", originalPostId: originalPostIdToAdd });

        // Let the state machine handle the scroll timing via existingPost transition
        // The scroll will be triggered when the state machine sets programmaticScrollTarget
        return; // Exit early - let state machine handle the rest
      }
      actor.send({ type: "ADD_POST", originalPostId: originalPostIdToAdd });

      try {
        const postDetails: PostData | null =
          await getPostDetailsAction(originalPostIdToAdd);

        if (postDetails) {
          // Use the original post ID as the instance ID for consistency with server posts
          // Since we already checked for duplicates, we know this is a new post
          const newInstanceId: PostId = postDetails.id;

          // Create initial post content (factory handles JSX creation)
          const { renderedContent, isContentReady } = createPostContent({
            isMdx: postDetails.isMdx,
            rawContent: postDetails.rawContent,
          });

          const newPostForClientState: RenderedPost = {
            id: newInstanceId, // This is the instance ID
            originalId: postDetails.id,
            title: postDetails.title,
            lastEdited: postDetails.lastEdited,
            createdAt: postDetails.createdAt,
            type: postDetails.type,
            tags: postDetails.tags,
            originalUrl: postDetails.originalUrl,
            renderedContent,
            isDismissed: false,
            isContentReady,
          };

          ensurePostIdInvariant(
            newPostForClientState.id,
            newPostForClientState.originalId,
            "usePostManagement.POST_LOADED"
          );
          actor.send({
            type: "POST_LOADED",
            post: newPostForClientState,
            newPostId: newInstanceId,
          });

          // For MDX posts, render the content asynchronously and update
          if (postDetails.isMdx && postDetails.rawContent) {
            // Plugins must mirror server-side renderMdxContent so first-click
            // posts compile identically (e.g. remark-comment for HTML
            // comments) and heading anchors exist on both paths.
            serialize(stripMdxHtmlComments(postDetails.rawContent), {
              mdxOptions: {
                remarkPlugins: mdxRemarkPlugins,
                rehypePlugins: mdxRehypePlugins,
              },
            })
              .then((mdxSource) => {
                // Get the components
                const components = getMDXComponents({});

                // Use factory to create MDX content to avoid JSX in this file
                const { renderedContent: mdxRenderedContent } =
                  createPostContent({
                    isMdx: true,
                    mdxSource,
                    components: components as Record<
                      string,
                      React.ComponentType<Record<string, unknown>>
                    >,
                  });

                // Send an update to the state machine with content ready flag
                actor.send({
                  type: "UPDATE_POST_CONTENT",
                  postId: newInstanceId,
                  renderedContent: mdxRenderedContent,
                  isContentReady: true, // Mark content as ready when MDX rendering completes
                });
              })
              .catch((_error) => {
                const { renderedContent: errorRenderedContent } =
                  createPostContent({
                    isError: true,
                    errorMessage: "Error rendering MDX content.",
                  });

                actor.send({
                  type: "UPDATE_POST_CONTENT",
                  postId: newInstanceId,
                  renderedContent: errorRenderedContent,
                  isContentReady: true, // Mark as ready even for errors to prevent stuck loading state
                });
              });
          }
        } else {
          actor.send({
            type: "POST_LOAD_ERROR",
            error: `Could not load post "${originalPostIdToAdd}"`,
          });
          console.error(`Error: Could not load post "${originalPostIdToAdd}".`);
        }
      } catch {
        actor.send({
          type: "POST_LOAD_ERROR",
          error: "An error occurred while loading the post",
        });
        console.error("An error occurred while loading the post.");
      }
    },
    [actor, posts, dismissingInfo]
  );

  const dismissPost = useCallback(
    (postIdToDismiss: string, indexToDismiss: number) => {
      // Clear any existing timeouts first
      clearTimeouts();

      // Check if we're already dismissing something to prevent double-dismissals
      if (dismissingInfo) {
        return;
      }

      if (posts.length <= 1) {
        goHome();
        return;
      }

      // Validate that the post to dismiss exists in our state
      const postToToDismiss = posts.find((p) => p.id === postIdToDismiss);
      if (!postToToDismiss) {
        return;
      }

      // Use helper to validate and correct the index if needed
      const { isValid, correctIndex } = validateAndCorrectIndex(
        posts,
        postIdToDismiss,
        indexToDismiss
      );

      const resolvedIndex = (() => {
        if (!isValid) {
          if (correctIndex === -1) {
            return -1;
          }
          return correctIndex;
        }
        return indexToDismiss;
      })();

      if (resolvedIndex === -1) {
        return;
      }

      // Note: Scroll target is now determined by the state machine during ANIMATION_COMPLETE
      // This ensures consistent timing and coordination with DOM updates

      // Send DISMISS_POST event to state machine
      actor.send({
        type: "DISMISS_POST",
        postId: postIdToDismiss,
        index: resolvedIndex,
      });

      // Try to find the DOM element for animation
      const articleElement = document.querySelector(
        `[data-post-index="${indexToDismiss}"]`
      ) as HTMLElement;
      if (articleElement) {
        articleElement.style.setProperty(
          "--original-height",
          `${articleElement.offsetHeight}px`
        );
      } else {
        // Fallback: try to find by post ID
        const fallbackElement = document.querySelector(
          `[data-post-id="${postIdToDismiss}"]`
        ) as HTMLElement;
        if (fallbackElement) {
          fallbackElement.style.setProperty(
            "--original-height",
            `${fallbackElement.offsetHeight}px`
          );
        }
        // Element not found, animation will be skipped
      }

      // Store timeout ID in ref so it can be cleared if needed
      animationTimeoutRef.current = setTimeout(() => {
        // Send ANIMATION_COMPLETE event after animation
        // The XState machine will now handle the DOM update, settling period, and scroll timing
        actor.send({ type: "ANIMATION_COMPLETE" });

        // Calculate new stack IDs after dismissal for URL update
        const newStackIds = currentStackIds.filter(
          (id: string) => id !== postIdToDismiss
        );

        // Update URL immediately - the XState machine will handle the scroll timing
        updateUrl(newStackIds);

        // Note: Scroll target is now automatically determined and triggered by the state machine
        // during ANIMATION_COMPLETE → settling → scrolling transition
      }, 1000); // Animation time
    },
    [
      actor,
      posts,
      currentStackIds,
      updateUrl,
      goHome,
      dismissingInfo,
      clearTimeouts,
    ]
  );

  return {
    addPost,
    dismissPost,
    clearTimeouts, // Export the clearTimeouts function so it can be called externally if needed
  };
}
