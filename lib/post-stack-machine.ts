import { assign, type createActor, setup } from "xstate";
import type { ScrollState } from "@/lib/scroll-utils";
import { cancelCurrentScroll } from "@/lib/scroll-utils";
import type { RenderedPost } from "@/types/post";

// Define the machine context type
export interface PostStackContext {
  activePostId: string | null; // Currently active/focused post ID
  allAvailablePostIds: string[]; // For footer links
  currentStackIds: string[]; // Post IDs currently in the client's view
  dismissingInfo: { id: string } | null; // Post ID of the post being dismissed
  error: string | null;
  isInitialLoad: boolean; // Track initial load to prevent intersection observer interference
  isLoadingNewPost: string | null; // Post ID of the post being loaded
  isProgrammaticScroll: boolean; // Lock to prevent observer interference during programmatic scrolls
  pendingNavigation: {
    stackIds: string[];
    direction: "forward" | "backward";
  } | null; // Store pending navigation during scroll cancellation
  postCache: RenderedPost[]; // Cache of all loaded posts for browser navigation
  posts: RenderedPost[];
  programmaticScrollTarget: string | null; // Track programmatic scroll target
  scrollOperationId: number; // Track current scroll operation to ignore stale completions
  scrollState: ScrollState;
  serverInitialStackIds: string[]; // Original stack IDs from server
  visiblePostIds: string[]; // IDs of posts that should be visible (for browser navigation)
}

// Define the input type for the machine
export interface PostStackInput {
  activePostId: string | null;
  allAvailablePostIds: string[];
  currentStackIds: string[];
  posts: RenderedPost[];
  serverInitialStackIds: string[];
}

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
  | { type: "SCROLL_ERROR"; error: string; operationId?: number }
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
 * Coordinates URL state, post loading, and programmatic scroll.
 *
 * Scroll completion is event-driven: `SCROLL_COMPLETE` / `SCROLL_SUCCESS`
 * arrives from the provider once the browser fires `scrollend` (or the
 * scroll-utils safety cap fires). The machine has no `after:` timers gating
 * scroll state — it transitions only on real events. `isProgrammaticScroll`
 * is released the instant scroll completion arrives, so the intersection
 * observer wakes up without an artificial buffer.
 *
 * Transient states (`cancellingScroll`, `goingHome`) use `always` to advance
 * synchronously after applying their entry actions.
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
    postCache: input.posts,
    visiblePostIds: input.currentStackIds,
    isProgrammaticScroll: false,
    scrollOperationId: 0,
    pendingNavigation: null,
  }),
  states: {
    /**
     * Entry point for browser back/forward navigation.
     * If any visible post isn't cached, fetch it first; otherwise restore scroll.
     */
    processingNavigation: {
      entry: assign({ scrollState: "idle" }),
      always: [
        {
          target: "loadingPost",
          guard: ({ context }) => {
            const missingPosts = context.visiblePostIds.filter(
              (id) => !context.postCache.some((p) => p.originalId === id)
            );
            return missingPosts.length > 0;
          },
        },
        {
          target: "restoringScroll",
          guard: ({ context }) => {
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
        isProgrammaticScroll: true,
        scrollState: "programmaticScroll",
        scrollOperationId: ({ context }) => context.scrollOperationId + 1,
      }),
      on: {
        SCROLL_COMPLETE: {
          target: "idle",
          guard: ({ context, event }) =>
            !event.operationId || event.operationId === context.scrollOperationId,
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false,
            programmaticScrollTarget: null,
            isInitialLoad: false,
          }),
        },
        SCROLL_ERROR: {
          target: "idle",
          guard: ({ context, event }) =>
            !event.operationId || event.operationId === context.scrollOperationId,
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false,
            programmaticScrollTarget: null,
            isInitialLoad: false,
            error: ({ event }) => event.error,
          }),
        },
        USER_INTERACTION: {
          target: "idle",
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false,
            programmaticScrollTarget: null,
            isInitialLoad: false,
          }),
        },
        BROWSER_NAVIGATION: {
          target: "cancellingScroll",
          actions: [
            () => {
              cancelCurrentScroll();
            },
            assign({
              pendingNavigation: ({ event }) => ({
                stackIds: event.stackIds,
                direction: event.direction,
              }),
              programmaticScrollTarget: null,
              scrollOperationId: ({ context }) => context.scrollOperationId + 1,
            }),
          ],
        },
      },
    },

    /**
     * Transient: applies the pending navigation that arrived during a scroll
     * and routes back through processingNavigation. cancelCurrentScroll() ran
     * already in the entry action, so there's nothing async to wait for.
     */
    cancellingScroll: {
      entry: assign({
        scrollState: "idle",
        programmaticScrollTarget: null,
      }),
      always: {
        target: "processingNavigation",
        actions: assign(({ context }) => {
          const nav = context.pendingNavigation;
          if (!nav) {
            return {};
          }

          const newPosts = nav.stackIds
            .map((id) => context.postCache.find((p) => p.originalId === id))
            .filter((p): p is RenderedPost => p !== undefined);

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

    /**
     * Default stable state. Observer is unlocked here. Scroll completion
     * (SCROLL_COMPLETE / SCROLL_SUCCESS) lands directly here from `scrolling`
     * and `restoringScroll`.
     */
    idle: {
      entry: assign({
        scrollState: "idle",
        error: null,
        programmaticScrollTarget: null,
      }),
      // Handles the initial render where the active post isn't the first in
      // the stack — kick off a scroll once.
      always: [
        {
          target: "scrolling",
          guard: ({ context }) => {
            if (
              !(context.isInitialLoad && context.activePostId) ||
              context.posts.length <= 1
            ) {
              return false;
            }
            const firstPostId = context.posts[0]?.id;
            return context.activePostId !== firstPostId;
          },
          actions: assign({
            programmaticScrollTarget: ({ context }) => context.activePostId,
            isProgrammaticScroll: true,
            scrollState: "programmaticScroll",
            isInitialLoad: false,
          }),
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
        DISMISS_POST: {
          target: "dismissing",
          guard: ({ context }) => context.posts.length > 1,
          actions: assign({
            dismissingInfo: ({ event }) => ({ id: event.postId }),
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
            activePostId: ({ event }) => event.postId,
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
            programmaticScrollTarget: ({ event }) => event.activePostId,
          }),
        },
        BROWSER_NAVIGATION: {
          target: "processingNavigation",
          actions: [
            () => {
              cancelCurrentScroll();
            },
            assign({
              currentStackIds: ({ event }) => event.stackIds,
              visiblePostIds: ({ event }) => event.stackIds,
              posts: ({ context, event }) => {
                const newPosts = event.stackIds
                  .map((id) =>
                    context.postCache.find((p) => p.originalId === id)
                  )
                  .filter((p): p is RenderedPost => p !== undefined);
                return Array.from(
                  new Map(newPosts.map((post) => [post.id, post])).values()
                );
              },
              activePostId: ({ context, event }) => {
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
          actions: assign({
            isProgrammaticScroll: (_) => false,
          }),
        },
      },
    },

    existingPost: {
      entry: assign({
        scrollState: "programmaticScroll" as const,
        isProgrammaticScroll: true,
      }),
      always: { target: "scrolling" },
    },

    loadingPost: {
      on: {
        POST_LOADED: {
          target: "scrolling",
          actions: assign({
            posts: ({ context, event }) => [...context.posts, event.post],
            postCache: ({ context, event }) => {
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
     * Active scroll animation. Observer is locked.
     *
     * Exits only on real events:
     *   SCROLL_COMPLETE → idle (provider sends after scrollend)
     *   USER_INTERACTION → idle (user interrupted; release lock)
     *   BROWSER_NAVIGATION → cancellingScroll (incoming nav supersedes)
     *
     * There is no `after:` fallback. scroll-utils has its own safety caps
     * (waitForPostStable: 2s, waitForScrollEnd: 1.5s) that guarantee the
     * scroll function resolves; the provider always sends SCROLL_COMPLETE in
     * its catch block. A machine timer here would only mask scroll-utils bugs.
     */
    scrolling: {
      entry: assign({
        scrollState: "programmaticScroll",
        isProgrammaticScroll: true,
        scrollOperationId: ({ context }) => context.scrollOperationId + 1,
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
              scrollState: "idle",
            }),
          },
        ],
        SCROLL_COMPLETE: {
          target: "idle",
          guard: ({ context, event }) =>
            !event.operationId || event.operationId === context.scrollOperationId,
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false,
            programmaticScrollTarget: null,
            isInitialLoad: false,
          }),
        },
        USER_INTERACTION: {
          target: "idle",
          actions: assign({
            scrollState: "idle",
            isProgrammaticScroll: false,
            programmaticScrollTarget: null,
            isInitialLoad: false,
          }),
        },
        SET_ACTIVE_POST: {
          actions: assign({
            activePostId: ({ event }) => event.postId,
          }),
        },
        BROWSER_NAVIGATION: {
          target: "cancellingScroll",
          actions: [
            () => {
              cancelCurrentScroll();
            },
            assign({
              pendingNavigation: ({ event }) => ({
                stackIds: event.stackIds,
                direction: event.direction,
              }),
              programmaticScrollTarget: null,
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

    /**
     * TV-shutoff animation in progress. ANIMATION_COMPLETE removes the post
     * and routes directly to scrolling — the new active post's target element
     * is awaited by the provider via waitForPostStable, no separate "settling"
     * state needed.
     */
    dismissing: {
      on: {
        ANIMATION_COMPLETE: {
          target: "scrolling",
          actions: assign({
            posts: ({ context }) => {
              if (!context.dismissingInfo) {
                return context.posts;
              }
              return context.posts.filter(
                (post) => post.id !== context.dismissingInfo?.id
              );
            },
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
              const previousOriginalId =
                context.currentStackIds[dismissingIndex - 1];
              const previousPost = context.posts.find(
                (p) => p.originalId === previousOriginalId
              );
              return previousPost?.id || null;
            },
            programmaticScrollTarget: ({ context }) => {
              if (!context.dismissingInfo) {
                return null;
              }
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
              const previousOriginalId =
                context.currentStackIds[dismissingIndex - 1];
              const previousPost = context.posts.find(
                (p) => p.originalId === previousOriginalId
              );
              return previousPost?.id || null;
            },
            dismissingInfo: null,
            scrollState: "programmaticScroll",
          }),
        },
      },
    },

    /**
     * Transient: clear posts/active state, then enter idle.
     */
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
      always: { target: "idle" },
    },

    error: {
      on: {
        CLEAR_ERROR: {
          target: "idle",
          actions: assign({ error: null }),
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
