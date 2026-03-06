import { assign, type createActor, setup } from "xstate";
import type { ScrollState } from "@/lib/scroll-utils";
import { cancelCurrentScroll } from "@/lib/scroll-utils";
import type { RenderedPost } from "@/types/post";

// Define the machine context type
export type PostStackContext = {
  posts: RenderedPost[];
  currentStackIds: string[]; // Post IDs currently in the client's view
  activePostId: string | null; // Currently active/focused post ID
  dismissingInfo: { id: string } | null; // Post ID of the post being dismissed
  isLoadingNewPost: string | null; // Post ID of the post being loaded
  allAvailablePostIds: string[]; // For footer links
  serverInitialStackIds: string[]; // Original stack IDs from server
  scrollState: ScrollState;
  error: string | null;
  programmaticScrollTarget: string | null; // Track programmatic scroll target
  isInitialLoad: boolean; // Track initial load to prevent intersection observer interference
  postCache: RenderedPost[]; // Cache of all loaded posts for browser navigation
  visiblePostIds: string[]; // IDs of posts that should be visible (for browser navigation)
  isProgrammaticScroll: boolean; // Lock to prevent observer interference during programmatic scrolls
  scrollOperationId: number; // Track current scroll operation to ignore stale completions
  pendingNavigation: { stackIds: string[]; direction: "forward" | "backward" } | null; // Store pending navigation during scroll cancellation
};

// Define the input type for the machine
export type PostStackInput = {
  posts: RenderedPost[];
  currentStackIds: string[];
  allAvailablePostIds: string[];
  serverInitialStackIds: string[];
  activePostId: string | null;
};

// Define all possible events
export type PostStackEvent =
  | { type: "ADD_POST"; originalPostId: string }
  | { type: "POST_LOADED"; post: RenderedPost; newPostId: string }
  | { type: "POST_LOAD_ERROR"; error: string }
  | { type: "DISMISS_POST"; postId: string; index: number }
  | { type: "SCROLL_TO_POST"; postId: string }
  | { type: "SET_ACTIVE_POST"; postId: string | null }
  | { type: "ANIMATION_COMPLETE" }
  | { type: "SCROLL_COMPLETE"; operationId?: number }
  | { type: "SCROLL_RESTORED" }
  | { type: "SCROLL_SUCCESS"; operationId?: number }
  | { type: "SCROLL_ERROR"; error: string; operationId?: number }
  | { type: "SCROLL_CANCELLED" }
  | { type: "URL_UPDATED"; stackIds: string[]; activePostId: string | null }
  | {
      type: "BROWSER_NAVIGATION";
      stackIds: string[];
      direction: "forward" | "backward";
    }
  | { type: "GO_HOME" }
  | { type: "CLEAR_ERROR" }
  | {
      type: "UPDATE_POST_CONTENT";
      postId: string;
      renderedContent: React.ReactNode;
      isContentReady?: boolean;
    }
  | { type: "USER_INTERACTION" }
  | { type: "ENABLE_OBSERVER" };

/**
 * POST STACK STATE MACHINE
 *
 * Manages the coordination between URL state, post loading, and scroll behavior.
 *
 * STATE FLOW ARCHITECTURE:
 * ========================
 * 1. URL is the single source of truth (managed by UrlStateManager)
 * 2. State machine coordinates transitions and scroll behavior
 * 3. DOM reactively updates based on machine context
 *
 * KEY PRINCIPLES:
 * - No circular dependencies - each state has clear entry/exit conditions
 * - Scroll locking prevents observer interference during programmatic scrolls
 * - Browser navigation is handled atomically to prevent state corruption
 * - Post cache enables instant back/forward navigation
 *
 * MAIN STATE TRANSITIONS:
 * - idle → loadingPost → scrolling → settled → idle (new post flow)
 * - idle → existingPost → scrolling → settled → idle (navigate to cached post)
 * - idle → dismissing → settling → scrolling → settled → idle (dismiss flow)
 * - any → processingNavigation → restoringScroll → settlingScroll → idle (browser nav)
 * - any → userInterruption → idle (user scroll interruption)
 */
export const postStackMachine = setup({
  types: {
    context: {} as PostStackContext,
    events: {} as PostStackEvent,
    input: {} as PostStackInput,
  },
}).createMachine({
  id: "postStack",
  initial: "idle",
  context: ({ input }) => ({
    posts: input.posts,
    currentStackIds: input.currentStackIds,
    activePostId: input.activePostId,
    dismissingInfo: null,
    isLoadingNewPost: null,
    allAvailablePostIds: input.allAvailablePostIds,
    serverInitialStackIds: input.serverInitialStackIds,
    scrollState: "idle" as ScrollState,
    error: null,
    programmaticScrollTarget: null,
    isInitialLoad: true,
    postCache: input.posts, // Initialize cache with server posts
    visiblePostIds: input.currentStackIds, // Initialize visible posts
    isProgrammaticScroll: false, // Initialize scroll lock as false
    scrollOperationId: 0, // Initialize scroll operation ID
    pendingNavigation: null, // Initialize pending navigation
  }),
  states: {
    /**
     * PROCESSING NAVIGATION STATE
     *
     * Entry point for browser back/forward navigation.
     * Decides whether to load missing posts or restore scroll position.
     *
     * Transitions:
     * - → loadingPost (if posts need to be fetched)
     * - → restoringScroll (if all posts are cached)
     */
    processingNavigation: {
      entry: assign({
        scrollState: "idle",
      }),
      always: [
        {
          target: "loadingPost",
          guard: ({ context }) => {
            // Check if any posts are missing from cache
            const missingPosts = context.visiblePostIds.filter(
              (id) => !context.postCache.some((p) => p.originalId === id)
            );
            return missingPosts.length > 0;
          },
        },
        {
          target: "restoringScroll",
          guard: ({ context }) => {
            // All posts are cached, go to scroll restoration
            const missingPosts = context.visiblePostIds.filter(
              (id) => !context.postCache.some((p) => p.originalId === id)
            );
            return missingPosts.length === 0;
          },
        },
      ],
    },
    restoringScroll: {
      entry: assign({
        isProgrammaticScroll: true, // Lock observer during programmatic scroll
        scrollState: "programmaticScroll",
        scrollOperationId: ({ context }) => context.scrollOperationId + 1, // Increment operation ID
      }),
      on: {
        SCROLL_SUCCESS: {
          target: "settlingScroll",
          guard: ({ context, event }) => {
            // Only accept success from current operation
            return !event.operationId || event.operationId === context.scrollOperationId;
          },
          actions: assign({
            scrollState: "settling",
          }),
        },
        SCROLL_ERROR: {
          target: "settlingScroll",
          guard: ({ context, event }) => {
            // Only accept error from current operation
            return !event.operationId || event.operationId === context.scrollOperationId;
          },
          actions: assign({
            scrollState: "settling",
            error: ({ event }) => event.error,
          }),
        },
        SCROLL_RESTORED: {
          target: "scrolling",
          actions: assign({
            scrollState: "programmaticScroll",
          }),
        },
        USER_INTERACTION: {
          target: "userInterruption",
          actions: assign({
            scrollState: "userInteraction",
          }),
        },
        BROWSER_NAVIGATION: {
          target: "cancellingScroll",
          actions: [
            // Cancel any in-progress scroll animation first
            () => {
              cancelCurrentScroll();
            },
            assign({
              // Store the pending navigation for after cancellation
              pendingNavigation: ({ event }) => ({
                stackIds: event.stackIds,
                direction: event.direction,
              }),
              // Clear current scroll target to stop any in-progress operations
              programmaticScrollTarget: null,
              // Increment operation ID to invalidate any pending completions
              scrollOperationId: ({ context }) => context.scrollOperationId + 1,
            }),
          ],
        },
      },
    },
    cancellingScroll: {
      entry: assign({
        scrollState: "idle",
        programmaticScrollTarget: null,
      }),
      on: {
        SCROLL_CANCELLED: {
          target: "processingNavigation",
          actions: assign(({ context }) => {
            const nav = context.pendingNavigation;
            if (!nav) {
              return {};
            }

            // Apply the pending navigation
            const newPosts = nav.stackIds
              .map((id) =>
                context.postCache.find((p) => p.originalId === id)
              )
              .filter((p): p is RenderedPost => p !== undefined);

            // Ensure no duplicates by using Map with post ID as key
            const uniquePosts = Array.from(
              new Map(newPosts.map((post) => [post.id, post])).values()
            );

            const targetOriginalId = nav.stackIds.at(-1);
            const targetPost = targetOriginalId
              ? context.postCache.find((p) => p.originalId === targetOriginalId)
              : null;

            return {
              currentStackIds: nav.stackIds,
              visiblePostIds: nav.stackIds,
              posts: uniquePosts,
              activePostId: targetPost?.id ?? null,
              programmaticScrollTarget: targetPost?.id ?? null,
              pendingNavigation: null,
              isLoadingNewPost: null,
              dismissingInfo: null,
            };
          }),
        },
      },
      after: {
        // Brief delay to ensure scroll is cancelled
        50: {
          actions: () => {
            // Send the cancellation event to self
            const actor = globalThis.__postStackActor;
            if (actor) {
              actor.send({ type: "SCROLL_CANCELLED" });
            }
          },
        },
      },
    },
    settlingScroll: {
      entry: assign({
        scrollState: "settling",
      }),
      after: {
        // Brief pause to ensure state is stable before going idle
        150: {
          target: "idle",
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false, // Unlock observer
            programmaticScrollTarget: null, // Clear scroll target
            isInitialLoad: false, // Ensure initial load is complete
          }),
        },
      },
      on: {
        USER_INTERACTION: {
          target: "userInterruption",
          actions: assign({
            scrollState: "userInteraction",
          }),
        },
      },
    },
    userInterruption: {
      entry: assign({
        scrollState: "userInteraction",
        isProgrammaticScroll: false, // Unlock observer immediately for user interaction
        programmaticScrollTarget: null, // Clear any programmatic scroll target
      }),
      after: {
        // Settling period after user interaction
        150: {
          target: "idle",
          actions: assign({
            scrollState: "idle",
            isInitialLoad: false,
          }),
        },
      },
      on: {
        // Handle browser navigation during user interaction
        BROWSER_NAVIGATION: {
          target: "processingNavigation",
          actions: [
            // Cancel any in-progress scroll animation first
            () => {
              cancelCurrentScroll();
            },
            assign({
              currentStackIds: ({ event }) => event.stackIds,
              visiblePostIds: ({ event }) => event.stackIds,
              posts: ({ context, event }) => {
                // ATOMIC UPDATE: Build entirely new posts array from cache only
                // This prevents state corruption and duplicate posts
                const newPosts = event.stackIds
                  .map((id) =>
                    context.postCache.find((p) => p.originalId === id)
                  )
                  .filter((p): p is RenderedPost => p !== undefined);

                // Ensure no duplicates by using Map with post ID as key
                const uniquePosts = Array.from(
                  new Map(newPosts.map((post) => [post.id, post])).values()
                );

                return uniquePosts;
              },
              activePostId: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID for scrolling
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              isProgrammaticScroll: true, // Mark as browser navigation (programmatic)
            }),
          ],
        },
        // Allow immediate transitions during user interaction
        ADD_POST: [
          {
            target: "existingPost",
            guard: ({ context, event }) =>
              context.posts.some(
                (post) =>
                  post.originalId === event.originalPostId &&
                  (!context.dismissingInfo ||
                    context.dismissingInfo.id !== post.id)
              ),
            actions: assign({
              activePostId: ({ context, event }) => {
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
            }),
          },
          {
            target: "loadingPost",
            guard: ({ context }) => context.isLoadingNewPost === null,
            actions: assign({
              isLoadingNewPost: ({ event }) => event.originalPostId,
            }),
          },
        ],
        SET_ACTIVE_POST: {
          actions: assign({
            activePostId: ({ event }) => event.postId,
          }),
        },
      },
    },
    /**
     * IDLE STATE
     *
     * Default stable state where the system awaits user interaction.
     * All scrolling and loading operations have completed.
     *
     * Context on entry:
     * - scrollState: 'idle'
     * - programmaticScrollTarget: null
     * - Observer lock released (unless waiting for user interaction)
     *
     * Handles:
     * - ADD_POST: Navigate to new or existing post
     * - DISMISS_POST: Remove post from stack
     * - SCROLL_TO_POST: Programmatic scroll to specific post
     * - BROWSER_NAVIGATION: Handle back/forward buttons
     * - SET_ACTIVE_POST: Update active post without scrolling
     */
    idle: {
      entry: assign({
        scrollState: "idle",
        error: null,
        programmaticScrollTarget: null,
      }),
      // Check immediately if we need initial scroll
      always: [
        {
          target: "scrolling",
          guard: ({ context }) => {
            // Initial scroll needed if:
            // 1. This is the initial load
            // 2. We have an active post
            // 3. We have multiple posts
            // 4. The active post is not the first post
            if (
              !(context.isInitialLoad && context.activePostId) ||
              context.posts.length <= 1
            ) {
              return false;
            }
            const firstPostId = context.posts[0]?.id;
            return context.activePostId !== firstPostId;
          },
          actions: [
            assign({
              programmaticScrollTarget: ({ context }) => context.activePostId,
              isProgrammaticScroll: true,
              scrollState: "programmaticScroll",
              isInitialLoad: false, // Clear the flag
            }),
          ],
        },
      ],
      on: {
        ADD_POST: [
          {
            target: "existingPost",
            guard: ({ context, event }) =>
              context.posts.some(
                (post) =>
                  post.originalId === event.originalPostId &&
                  (!context.dismissingInfo ||
                    context.dismissingInfo.id !== post.id)
              ),
            actions: assign({
              activePostId: ({ context, event }) => {
                // Find the actual post instance ID, not the original ID
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
              // Existing posts don't need margin
            }),
          },
          {
            target: "loadingPost",
            guard: ({ context }) => context.isLoadingNewPost === null,
            actions: assign({
              isLoadingNewPost: ({ event }) => event.originalPostId,
            }),
          },
        ],
        DISMISS_POST: {
          target: "dismissing",
          guard: ({ context }) => context.posts.length > 1,
          actions: assign({
            dismissingInfo: ({ event }) => ({
              id: event.postId,
            }),
          }),
        },
        SCROLL_TO_POST: {
          target: "scrolling",
          guard: ({ context, event }) =>
            context.posts.some(
              (post) =>
                post.id === event.postId || post.originalId === event.postId
            ),
          actions: assign({
            scrollState: "programmaticScroll",
            programmaticScrollTarget: ({ event }) => event.postId,
            activePostId: ({ event }) => event.postId, // Set active post when scrolling to it
            // Navigation scrolls don't need margin
          }),
        },
        SET_ACTIVE_POST: {
          actions: assign({
            activePostId: ({ event }) => event.postId,
          }),
        },
        GO_HOME: {
          target: "goingHome",
        },
        URL_UPDATED: {
          actions: assign({
            currentStackIds: ({ event }) => event.stackIds,
            activePostId: ({ event }) => event.activePostId,
            // Set programmatic scroll target to ensure initial page load scrolls to active post
            programmaticScrollTarget: ({ event }) => event.activePostId,
            // Initial page loads don't need margin
          }),
        },
        BROWSER_NAVIGATION: {
          target: "processingNavigation",
          actions: [
            // Cancel any in-progress scroll animation first
            () => {
              cancelCurrentScroll();
            },
            assign({
              currentStackIds: ({ event }) => event.stackIds,
              visiblePostIds: ({ event }) => event.stackIds,
              posts: ({ context, event }) => {
                // ATOMIC UPDATE: Build entirely new posts array from cache only
                // This prevents state corruption and duplicate posts
                const newPosts = event.stackIds
                  .map((id) =>
                    context.postCache.find((p) => p.originalId === id)
                  )
                  .filter((p): p is RenderedPost => p !== undefined);

                // Ensure no duplicates by using Map with post ID as key
                const uniquePosts = Array.from(
                  new Map(newPosts.map((post) => [post.id, post])).values()
                );

                return uniquePosts;
              },
              activePostId: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID for scrolling
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              isLoadingNewPost: null,
              dismissingInfo: null,
            }),
          ],
        },
        UPDATE_POST_CONTENT: {
          actions: assign({
            posts: ({ context, event }) =>
              context.posts.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
            // CRITICAL: Also update the cache so browser navigation has the content
            postCache: ({ context, event }) =>
              context.postCache.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
          }),
        },
        ENABLE_OBSERVER: {
          // User has explicitly interacted with the page - safe to enable observer
          actions: assign({
            isProgrammaticScroll: (_) => false,
          }),
        },
      },
    },

    existingPost: {
      entry: assign(({ context }) => {
        return {
          scrollState: "programmaticScroll" as const,
          isProgrammaticScroll: true, // Lock observer during programmatic scroll to existing post
          // programmaticScrollTarget is already set correctly in the ADD_POST transitions
        };
      }),
      // Immediate transition to scrolling since requestAnimationFrame ensures proper timing
      always: {
        target: "scrolling",
      },
    },

    loadingPost: {
      on: {
        POST_LOADED: {
          target: "scrolling",
          actions: assign({
            posts: ({ context, event }) => [...context.posts, event.post],
            postCache: ({ context, event }) => {
              // Update cache with the loaded post (which now has content)
              // Remove any existing version and add the new one with full content
              const filteredCache = context.postCache.filter(
                (p) => p.originalId !== event.post.originalId
              );
              return [...filteredCache, event.post];
            },
            currentStackIds: ({ context, event }) => [
              ...context.currentStackIds,
              event.newPostId,
            ],
            visiblePostIds: ({ context, event }) => [
              ...context.visiblePostIds,
              event.newPostId,
            ],
            activePostId: ({ event }) => event.newPostId,
            isLoadingNewPost: null,
            scrollState: "programmaticScroll",
            programmaticScrollTarget: ({ event }) => event.newPostId,
          }),
        },
        POST_LOAD_ERROR: {
          target: "error",
          actions: assign({
            error: ({ event }) => event.error,
            isLoadingNewPost: null,
          }),
        },
      },
    },

    /**
     * SCROLLING STATE
     *
     * Active scroll animation in progress.
     * Observer is locked to prevent interference with programmatic scrolling.
     *
     * Context on entry:
     * - scrollState: 'programmaticScroll'
     * - isProgrammaticScroll: true (locks intersection observer)
     * - programmaticScrollTarget: post ID to scroll to
     *
     * Exit conditions:
     * - SCROLL_COMPLETE: Animation finished successfully → settled
     * - USER_INTERACTION: User interrupted scroll → userInterruption
     * - Timeout (800ms): Fallback if scroll doesn't complete → settled
     *
     * The actual scroll is performed by PostStackProvider's useEffect
     * which watches for programmaticScrollTarget changes.
     */
    scrolling: {
      entry: assign({
        scrollState: "programmaticScroll",
        isProgrammaticScroll: true, // Lock observer during scroll-to-post
        scrollOperationId: ({ context }) => context.scrollOperationId + 1, // Increment operation ID for new scroll
      }),
      on: {
        ADD_POST: [
          {
            target: "existingPost",
            guard: ({ context, event }) =>
              context.posts.some(
                (post) =>
                  post.originalId === event.originalPostId &&
                  (!context.dismissingInfo ||
                    context.dismissingInfo.id !== post.id)
              ),
            actions: assign({
              activePostId: ({ context, event }) => {
                // Find the actual post instance ID, not the original ID
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
            }),
          },
          {
            target: "loadingPost",
            guard: ({ context }) => context.isLoadingNewPost === null,
            actions: assign({
              isLoadingNewPost: ({ event }) => event.originalPostId,
              scrollState: "idle", // Reset scroll state when starting to load
            }),
          },
        ],
        SCROLL_COMPLETE: {
          target: "settled",
          guard: ({ context, event }) => {
            // Only accept completion from current operation
            return !event.operationId || event.operationId === context.scrollOperationId;
          },
          actions: assign({
            scrollState: "settling",
            isInitialLoad: false,
          }),
        },
        USER_INTERACTION: {
          target: "userInterruption",
          actions: assign({
            scrollState: "userInteraction",
          }),
        },
        // Allow SET_ACTIVE_POST during scrolling (for user interactions)
        SET_ACTIVE_POST: {
          actions: assign({
            activePostId: ({ event }) => event.postId,
          }),
        },
        BROWSER_NAVIGATION: {
          target: "cancellingScroll",
          actions: [
            // Cancel any in-progress scroll animation first
            () => {
              cancelCurrentScroll();
            },
            assign({
              // Store the pending navigation for after cancellation
              pendingNavigation: ({ event }) => ({
                stackIds: event.stackIds,
                direction: event.direction,
              }),
              // Clear current scroll target to stop any in-progress operations
              programmaticScrollTarget: null,
              // Increment operation ID to invalidate any pending completions
              scrollOperationId: ({ context }) => context.scrollOperationId + 1,
            }),
          ],
        },
        UPDATE_POST_CONTENT: {
          actions: assign({
            posts: ({ context, event }) =>
              context.posts.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
            // CRITICAL: Also update the cache so browser navigation has the content
            postCache: ({ context, event }) =>
              context.postCache.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
          }),
        },
      },
      after: {
        // Shorter fallback timeout for more responsive interactions
        800: {
          target: "settled",
          actions: assign({
            scrollState: "settling",
          }),
        },
      },
    },

    settled: {
      entry: assign({
        scrollState: "settling",
        // Keep the lock during settling to prevent observer interference
        isProgrammaticScroll: true,
      }),
      after: {
        // Transition to idle but keep observer blocked until user interaction
        300: {
          target: "idle",
          actions: assign(({ context }) => {
            return {
              scrollState: "idle" as const,
              programmaticScrollTarget: null,
              isInitialLoad: false,
              // DO NOT release isProgrammaticScroll here - wait for user interaction
              // This prevents the observer from jumping back to the wrong post
            };
          }),
        },
      },
      on: {
        USER_INTERACTION: {
          target: "userInterruption",
          actions: assign({
            scrollState: "userInteraction",
          }),
        },
        ADD_POST: [
          {
            target: "existingPost",
            guard: ({ context, event }) =>
              context.posts.some(
                (post) =>
                  post.originalId === event.originalPostId &&
                  (!context.dismissingInfo ||
                    context.dismissingInfo.id !== post.id)
              ),
            actions: assign({
              activePostId: ({ context, event }) => {
                // Find the actual post instance ID, not the original ID
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                const existingPost = context.posts.find(
                  (post) =>
                    post.originalId === event.originalPostId &&
                    (!context.dismissingInfo ||
                      context.dismissingInfo.id !== post.id)
                );
                return existingPost?.id || null;
              },
            }),
          },
          {
            target: "loadingPost",
            guard: ({ context }) => context.isLoadingNewPost === null,
            actions: assign({
              isLoadingNewPost: ({ event }) => event.originalPostId,
              scrollState: "idle", // Reset scroll state when starting to load
            }),
          },
        ],
        // Allow immediate SET_ACTIVE_POST for user interactions
        SET_ACTIVE_POST: {
          target: "idle",
          actions: assign({
            activePostId: ({ event }) => event.postId,
            scrollState: "idle",
            programmaticScrollTarget: null,
          }),
        },
        BROWSER_NAVIGATION: {
          target: "processingNavigation",
          actions: [
            // Cancel any in-progress scroll animation first
            () => {
              cancelCurrentScroll();
            },
            assign({
              currentStackIds: ({ event }) => event.stackIds,
              visiblePostIds: ({ event }) => event.stackIds,
              posts: ({ context, event }) => {
                // ATOMIC UPDATE: Build entirely new posts array from cache only
                // This prevents state corruption and duplicate posts
                const newPosts = event.stackIds
                  .map((id) =>
                    context.postCache.find((p) => p.originalId === id)
                  )
                  .filter((p): p is RenderedPost => p !== undefined);

                // Ensure no duplicates by using Map with post ID as key
                const uniquePosts = Array.from(
                  new Map(newPosts.map((post) => [post.id, post])).values()
                );

                return uniquePosts;
              },
              activePostId: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              programmaticScrollTarget: ({ context, event }) => {
                // Find the actual post instance from cache to get the correct ID for scrolling
                const targetOriginalId = event.stackIds.at(-1);
                if (!targetOriginalId) {
                  return null;
                }

                const targetPost = context.postCache.find(
                  (p) => p.originalId === targetOriginalId
                );
                return targetPost?.id ?? null;
              },
              isLoadingNewPost: null,
              dismissingInfo: null,
            }),
          ],
        },
        UPDATE_POST_CONTENT: {
          actions: assign({
            posts: ({ context, event }) =>
              context.posts.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
            // CRITICAL: Also update the cache so browser navigation has the content
            postCache: ({ context, event }) =>
              context.postCache.map((post) =>
                post.id === event.postId
                  ? {
                      ...post,
                      renderedContent: event.renderedContent,
                      ...(event.isContentReady !== undefined && {
                        isContentReady: event.isContentReady,
                      }),
                    }
                  : post
              ),
          }),
        },
      },
    },

    dismissing: {
      on: {
        ANIMATION_COMPLETE: {
          target: "settling",
          actions: assign({
            posts: ({ context }) => {
              if (!context.dismissingInfo) {
                return context.posts;
              }
              return context.posts.filter(
                (post) => post.id !== context.dismissingInfo?.id
              );
            },
            // Keep the post in cache but remove from visible lists
            currentStackIds: ({ context }) => {
              if (!context.dismissingInfo) {
                return context.currentStackIds;
              }
              return context.currentStackIds.filter(
                (id) => id !== context.dismissingInfo?.id
              );
            },
            visiblePostIds: ({ context }) => {
              if (!context.dismissingInfo) {
                return context.visiblePostIds;
              }
              return context.visiblePostIds.filter(
                (id) => id !== context.dismissingInfo?.id
              );
            },
            activePostId: ({ context }) => {
              if (!context.dismissingInfo) {
                return context.activePostId;
              }
              // Find the post being dismissed to get its originalId
              const dismissingPost = context.posts.find(
                (p) => p.id === context.dismissingInfo?.id
              );
              if (!dismissingPost) {
                return context.activePostId;
              }

              const dismissingIndex = context.currentStackIds.indexOf(
                dismissingPost.originalId
              );
              if (dismissingIndex <= 0) {
                return context.activePostId;
              }

              // Get the previous post's originalId and find the actual post
              const previousOriginalId =
                context.currentStackIds[dismissingIndex - 1];
              const previousPost = context.posts.find(
                (p) => p.originalId === previousOriginalId
              );
              return previousPost?.id || null;
            },
            // Set programmatic scroll target for dismissal just like ADD_POST does
            programmaticScrollTarget: ({ context }) => {
              if (!context.dismissingInfo) {
                return null;
              }
              // Find the post being dismissed to get its originalId
              const dismissingPost = context.posts.find(
                (p) => p.id === context.dismissingInfo?.id
              );
              if (!dismissingPost) {
                return null;
              }

              const dismissingIndex = context.currentStackIds.indexOf(
                dismissingPost.originalId
              );
              if (dismissingIndex <= 0) {
                return context.activePostId;
              }

              // Get the previous post's originalId and find the actual post ID to scroll to
              const previousOriginalId =
                context.currentStackIds[dismissingIndex - 1];
              const previousPost = context.posts.find(
                (p) => p.originalId === previousOriginalId
              );
              return previousPost?.id || null;
            },
            dismissingInfo: null,
            scrollState: "settling",
          }),
        },
      },
    },

    settling: {
      entry: assign({
        scrollState: "settling",
      }),
      after: {
        // Brief delay to ensure DOM has updated before scrolling
        100: {
          target: "scrolling",
          actions: assign({
            scrollState: "programmaticScroll",
          }),
        },
      },
      on: {
        USER_INTERACTION: {
          target: "userInterruption",
          actions: assign({
            scrollState: "userInteraction",
          }),
        },
      },
    },

    goingHome: {
      entry: assign({
        posts: [],
        currentStackIds: [],
        activePostId: null,
        dismissingInfo: null,
        isLoadingNewPost: null,
        scrollState: "idle",
        programmaticScrollTarget: null,
      }),
      after: {
        // Immediate transition to idle after clearing state
        50: "idle",
      },
    },

    error: {
      on: {
        CLEAR_ERROR: {
          target: "idle",
          actions: assign({
            error: null,
          }),
        },
        ADD_POST: {
          target: "loadingPost",
          guard: ({ context }) => context.isLoadingNewPost === null,
          actions: assign({
            error: null,
            isLoadingNewPost: ({ event }) => event.originalPostId,
          }),
        },
      },
    },
  },
});

export type PostStackMachine = typeof postStackMachine;
export type PostStackActor = ReturnType<
  typeof createActor<typeof postStackMachine>
>;
