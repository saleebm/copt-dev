"use client";

import { useSelector } from "@xstate/react";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createActor } from "xstate";
import { useArticleRefs } from "@/hooks/use-article-refs";
import { usePermalink } from "@/hooks/use-permalink";
import { usePostManagement } from "@/hooks/use-post-management";
import { useScrollManagement } from "@/hooks/use-scroll-management";
import { useUrlManagement } from "@/hooks/use-url-management";
import { useUserScrollInterruption } from "@/hooks/use-user-scroll-interruption";
import { postStackMachine } from "@/lib/post-stack-machine";
import {
  readScrollMemory,
  restoreAnchorForPost,
} from "@/lib/post-stack-utils-client";
import { waitForPostStable } from "@/lib/scroll-utils";
import { createUrlStateManager } from "@/lib/url-state-manager";
import type {
  CategoryNode,
  PostTypeCount,
  TagWithMetadata,
} from "@/types/navigation";
import type { RenderedPost } from "@/types/post";

interface TimelineEntry {
  date: Date;
  formattedDate: string;
  monthKey: string;
  posts: RenderedPost[];
}

// Define context types for XState provider
export interface PostStackState {
  activePostId: string | null; // Currently active/focused post ID
  allAvailablePostIds: string[]; // For footer links
  // Navigation data from server (optimized metadata only)
  categories: CategoryNode[];
  chronicleData: Array<{
    id: string;
    slug: string;
    title: string;
    type: string;
    originalDate: Date;
    tags: Array<{ name: string }>;
    categories: Array<{ name: string }>;
  }>;
  concretePostIds: string[]; // Filtered concrete post IDs for navigation
  currentStackIds: string[]; // Post IDs currently in the client's view
  dismissingInfo: { id: string } | null; // Post ID of the post being dismissed
  initialActivePostId: string | null; // Initial active post ID for permalink handling
  isInitialLoad: boolean; // Track initial load to prevent intersection observer interference
  isLoadingNewPost: string | null; // Post ID of the post being loaded
  isProgrammaticScroll: boolean; // Lock to prevent observer interference during programmatic scrolls
  postCache: RenderedPost[]; // Cache of all loaded posts for browser navigation
  posts: RenderedPost[];
  postTypeCounts: PostTypeCount[];
  scrollState: "idle" | "programmaticScroll" | "userInteraction" | "settling"; // Current scroll state
  serverInitialStackIds: string[]; // Original stack IDs from server, for comparison
  tags: TagWithMetadata[];
  timeline: TimelineEntry[];
  visiblePostIds: string[]; // IDs of posts that should be visible (for browser navigation)
}

export interface PostStackActions {
  addPost: (originalPostId: string) => Promise<void>;
  copyPermalink: (postId: string) => Promise<void>;
  dismissPost: (postId: string, index: number) => void;
  getArticleRef: (index: number) => HTMLElement | null;
  getArticleRefs: () => (HTMLElement | null)[];
  goHome: () => void;
  scrollToPost: (postId: string, skipStateUpdate?: boolean) => Promise<void>;
  setActivePost: (postId: string | null) => void;
  setArticleRef: (index: number, element: HTMLElement | null) => void;
}

// Create contexts
export const PostStackStateContext = createContext<PostStackState | undefined>(
  undefined
);
export const PostStackActionsContext = createContext<
  PostStackActions | undefined
>(undefined);

// Export hooks for consuming the context
export function usePostStackState() {
  const context = useContext(PostStackStateContext);
  if (context === undefined) {
    throw new Error(
      "usePostStackState must be used within a PostStackProvider"
    );
  }
  return context;
}

export function usePostStackActions() {
  const context = useContext(PostStackActionsContext);
  if (context === undefined) {
    throw new Error(
      "usePostStackActions must be used within a PostStackProvider"
    );
  }
  return context;
}

interface PostStackProviderProps {
  allAvailablePostIds: string[];
  allTimeline: Array<{
    date: Date;
    posts: Array<{
      id: string;
      title: string;
      type: string;
      lastEdited: Date;
      originalId: string;
    }>;
    formattedDate: string;
    monthKey: string;
  }>;
  categories: CategoryNode[];
  children: React.ReactNode;
  chronicleData: Array<{
    id: string;
    slug: string;
    title: string;
    type: string;
    originalDate: Date;
    tags: Array<{ name: string }>;
    categories: Array<{ name: string }>;
  }>;
  concretePostIds: string[]; // Concrete post IDs from database query (PostType.CONCRETE)
  initialActivePostId?: string | null; // New prop for server-provided active post
  isRootPage?: boolean;
  postTypeCounts: PostTypeCount[];
  serverInitialPosts: RenderedPost[];
  serverInitialStackIds: string[]; // These are post IDs from the URL
  tags: TagWithMetadata[];
}

export function PostStackProvider({
  serverInitialPosts,
  serverInitialStackIds,
  allAvailablePostIds,
  concretePostIds,
  categories,
  tags,
  postTypeCounts,
  allTimeline,
  chronicleData,
  children,
  isRootPage = false,
  initialActivePostId = null,
}: PostStackProviderProps) {
  // Create URL state manager
  const [urlStateManager] = useState(() => {
    // Extract post IDs from the server posts to ensure consistency
    const initialPostIds = serverInitialPosts.map((post) => post.id);
    return createUrlStateManager(isRootPage, initialPostIds);
  });

  // Create the XState actor with initial context via input
  const [actor] = useState(() => {
    // Extract post IDs from the server posts to ensure consistency
    const initialPostIds = serverInitialPosts.map((post) => post.id);

    // Determine initial active post ID using URL state manager for consistency
    const urlState = urlStateManager.getCurrentState();
    // Default to last post (consistent with UrlStateManager behavior)
    const resolvedActivePostId =
      initialActivePostId ||
      urlState.activePostId ||
      (serverInitialPosts.length > 0
        ? (serverInitialPosts.at(-1)?.id ?? null)
        : null);

    // PostStackProvider initialized with activePostId: resolvedActivePostId

    const actorInstance = createActor(postStackMachine, {
      input: {
        posts: serverInitialPosts,
        currentStackIds: initialPostIds,
        allAvailablePostIds,
        serverInitialStackIds,
        activePostId: resolvedActivePostId,
      },
    });

    return actorInstance;
  });

  // Start the actor
  useEffect(() => {
    actor.start();

    // Store actor globally for the machine to access
    globalThis.__postStackActor = actor;

    return () => {
      globalThis.__postStackActor = undefined;
      actor.stop();
    };
  }, [actor]);

  // Use selectors for different parts of state
  const posts = useSelector(actor, (state) => state.context.posts);
  const currentStackIds = useSelector(
    actor,
    (state) => state.context.currentStackIds
  );
  const activePostId = useSelector(
    actor,
    (state) => state.context.activePostId
  );
  const dismissingInfo = useSelector(
    actor,
    (state) => state.context.dismissingInfo
  );
  const isLoadingNewPost = useSelector(
    actor,
    (state) => state.context.isLoadingNewPost
  );
  const scrollState = useSelector(actor, (state) => state.context.scrollState);
  const isInitialLoad = useSelector(
    actor,
    (state) => state.context.isInitialLoad
  );
  const postCache = useSelector(actor, (state) => state.context.postCache);
  const visiblePostIds = useSelector(
    actor,
    (state) => state.context.visiblePostIds
  );
  const programmaticScrollTarget = useSelector(
    actor,
    (state) => state.context.programmaticScrollTarget
  );
  const isProgrammaticScroll = useSelector(
    actor,
    (state) => state.context.isProgrammaticScroll
  );
  const scrollOperationId = useSelector(
    actor,
    (state) => state.context.scrollOperationId
  );

  // Use custom hooks to manage different aspects of functionality
  const { articleRefs, setArticleRef, getArticleRef } = useArticleRefs(
    posts,
    scrollState
  );
  const _getArticleRefs = useCallback(() => articleRefs.current, [articleRefs]);

  // Clear stale refs when posts change
  useEffect(() => {
    const currentRefs = articleRefs.current;
    const postIds = posts.map((p) => p.id);

    // Clear refs that don't match current posts
    for (let i = 0; i < currentRefs.length; i++) {
      const ref = currentRefs[i];
      if (ref) {
        const refPostId = ref.getAttribute("data-post-id");
        const expectedPostId = postIds[i];

        // If the ref doesn't match the expected post at this index, clear it
        if (refPostId !== expectedPostId) {
          currentRefs[i] = null;
        }
      }
    }

    // Trim the refs array to match posts length
    currentRefs.length = posts.length;
  }, [posts, articleRefs]);

  // Use URL management hook for all URL-related state management
  const { updateUrl, goHome } = useUrlManagement({
    actor,
    urlStateManager,
    posts,
    currentStackIds,
    isLoadingNewPost,
    isRootPage,
    scrollState,
  });

  // Use the new scroll management hook for centralized scroll handling
  const { scrollToPost } = useScrollManagement({
    posts,
    actor,
    articleRefs,
    setArticleRef,
    currentStackIds,
    scrollOperationId,
  });

  // Simple setActivePost function that just updates the state machine
  const setActivePost = useCallback(
    (postId: string | null) => {
      actor.send({ type: "SET_ACTIVE_POST", postId });
    },
    [actor]
  );

  const { addPost, dismissPost } = usePostManagement({
    actor,
    posts,
    dismissingInfo,
    goHome,
    updateUrl,
    currentStackIds,
    activePostId,
    setActivePost,
  });

  const { copyPermalink } = usePermalink({ posts });

  // Use user scroll interruption detection
  useUserScrollInterruption(actor, true);

  // Categories are now provided directly from the server as optimized metadata
  // No need to compute them from full post data anymore

  // Transform timeline data to include proper RenderedPost objects
  const timelineFromServer = useMemo(() => {
    return allTimeline.map((entry) => ({
      ...entry,
      posts: entry.posts.map((post) => ({
        id: post.id,
        originalId: post.originalId,
        title: post.title,
        type: post.type as "CONCRETE" | "BLOG" | "FINDING",
        lastEdited: post.lastEdited,
        createdAt: new Date(), // Use current date as fallback
        tags: [], // Will be populated if needed
        categories: [], // Will be populated if needed
        renderedContent: null,
        isDismissed: false,
        isContentReady: false,
      })),
    }));
  }, [allTimeline]);

  // Use server-provided navigation data directly (no computation needed)
  const navigationData = useMemo(
    () => ({
      categories,
      tags,
      timeline: timelineFromServer,
      postTypeCounts,
      chronicleData,
    }),
    [categories, tags, timelineFromServer, postTypeCounts, chronicleData]
  );

  /**
   * STATE SYNCHRONIZATION FLOW
   *
   * 1. URL is the single source of truth
   * 2. State machine (XState) manages transitions and scroll coordination
   * 3. DOM updates reactively based on state machine context
   *
   * Flow:
   * - User Action → URL Update → State Machine → DOM Update
   * - Browser Navigation → URL Parse → State Machine → DOM Update
   * - No circular dependencies between useEffects
   */

  // REMOVED: Server state sync - handled by initial state in actor creation
  // This eliminates one source of circular dependencies

  /**
   * CENTRALIZED PROGRAMMATIC SCROLL HANDLER
   *
   * Triggered by: programmaticScrollTarget state from XState
   *
   * Two paths, decided by whether scroll memory has an entry for the target:
   *   - With anchor: wait for the target post element to be layout-stable,
   *     then instantly restore the user to their captured heading + offset.
   *   - Without anchor: smooth-scroll to the top of the post via scrollToPost.
   *
   * Both paths send SCROLL_COMPLETE (or SCROLL_ERROR) once finished. No
   * timer-based DOM-readiness polling — waitForPostStable uses
   * MutationObserver + ResizeObserver and resolves on real events.
   */
  useEffect(() => {
    if (!programmaticScrollTarget || scrollState !== "programmaticScroll") {
      return;
    }

    const target = programmaticScrollTarget;
    const operationId = scrollOperationId;

    const performScroll = async () => {
      try {
        const memory = readScrollMemory();
        const storedAnchor = memory[target];

        if (storedAnchor) {
          // Anchor restore path: layout-stabilize, then instant scroll. The
          // anchor encodes (heading id + pixel offset) and is robust to
          // document height shifts between visits.
          await waitForPostStable(`section[data-post-id="${target}"]`);
          restoreAnchorForPost(target, storedAnchor);
          actor.send({ type: "SCROLL_COMPLETE", operationId });
          return;
        }

        // Top-of-post path: scrollToPost handles its own waitForPostStable
        // and sends SCROLL_COMPLETE from inside use-scroll-management. The
        // duplicate send below is a no-op for browser-nav cases where the
        // machine has already transitioned to idle.
        await scrollToPost(target, true);
        actor.send({ type: "SCROLL_COMPLETE", operationId });
      } catch (error) {
        actor.send({
          type: "SCROLL_ERROR",
          error:
            error instanceof Error ? error.message : "Unknown scroll error",
          operationId,
        });
      }
    };

    // Defer one frame so the React render that produced the target's DOM
    // node commits before we query for it. waitForPostStable handles the
    // case where the node still hasn't appeared.
    const rafId = requestAnimationFrame(() => {
      performScroll();
    });

    return () => cancelAnimationFrame(rafId);
  }, [
    programmaticScrollTarget,
    scrollState,
    scrollToPost,
    actor,
    scrollOperationId,
  ]);

  /**
   * MISSING POST LOADER
   *
   * Detects when posts in currentStackIds aren't loaded and triggers loading
   * This handles browser navigation to URLs with posts not in cache
   *
   * Triggered by: currentStackIds changes
   * Side effects: Calls addPost which updates state machine
   */
  useEffect(() => {
    // Find posts that should be visible but aren't loaded
    const missingPostIds = currentStackIds.filter(
      (id) =>
        !(
          posts.some((p) => p.originalId === id) ||
          posts.some((p) => p.id === id)
        )
    );

    // Load missing posts one at a time to maintain order
    if (missingPostIds.length > 0 && !isLoadingNewPost) {
      // Loading missing post: missingPostIds[0]
      addPost(missingPostIds[0]);
    }
  }, [currentStackIds, posts, isLoadingNewPost, addPost]);

  // Browser navigation is now handled by useCentralizedStateSync

  const stateValue = useMemo<PostStackState>(
    () => ({
      posts,
      currentStackIds,
      isLoadingNewPost,
      dismissingInfo,
      allAvailablePostIds,
      concretePostIds,
      serverInitialStackIds,
      activePostId,
      scrollState,
      isInitialLoad,
      initialActivePostId,
      postCache,
      visiblePostIds,
      isProgrammaticScroll,
      categories: navigationData.categories,
      tags: navigationData.tags,
      timeline: navigationData.timeline,
      postTypeCounts: navigationData.postTypeCounts,
      chronicleData: navigationData.chronicleData,
    }),
    [
      posts,
      currentStackIds,
      isLoadingNewPost,
      dismissingInfo,
      allAvailablePostIds,
      concretePostIds,
      serverInitialStackIds,
      activePostId,
      scrollState,
      isInitialLoad,
      initialActivePostId,
      postCache,
      visiblePostIds,
      isProgrammaticScroll,
      navigationData,
    ]
  );

  const actionsValue = useMemo<PostStackActions>(
    () => ({
      addPost,
      dismissPost,
      setArticleRef,
      getArticleRef,
      getArticleRefs: () => articleRefs.current,
      goHome,
      scrollToPost,
      setActivePost,
      copyPermalink,
    }),
    [
      addPost,
      dismissPost,
      setArticleRef,
      getArticleRef,
      goHome,
      scrollToPost,
      setActivePost,
      copyPermalink,
      articleRefs.current,
    ]
  );

  return (
    <PostStackStateContext.Provider value={stateValue}>
      <PostStackActionsContext.Provider value={actionsValue}>
        {children}
      </PostStackActionsContext.Provider>
    </PostStackStateContext.Provider>
  );
}
