import { notFound } from "next/navigation";
import PostStackList from "@/components/post-stack/post-stack-list";
import {
  getCachedAllAvailablePostIds,
  getCachedAllConcretePostIds,
  getCachedAllPostsByLastEdited,
  getCachedChroniclePosts,
  getCachedNestedCategoriesWithCounts,
  getCachedPostTypeCounts,
  getCachedTagsWithMetadata,
} from "@/lib/cached-posts";
import {
  type PostStackParams,
  parsePostStackParams,
  processPostIds,
} from "@/lib/post-stack-utils-client";
import { getRenderedPosts } from "@/lib/post-stack-utils-server";
import type { RenderedPost } from "@/types/post";

interface PostStackDataFetcherProps {
  allowNotFound?: boolean;
  initialActivePostId?: string | null;
  isRootPage: boolean;
  params: PostStackParams;
}

/**
 * Server component that handles all data fetching for post stacks.
 * This component enables Next.js Partial Pre-rendering (PPR) by isolating
 * data fetching in a separate component that can be wrapped with Suspense.
 */
export async function PostStackDataFetcher({
  params,
  isRootPage,
  allowNotFound = true,
}: Omit<PostStackDataFetcherProps, "initialActivePostId">) {
  // Parse post IDs from URL parameters
  const { postIds } = parsePostStackParams(params);

  // Process and deduplicate post IDs
  const processedIds = processPostIds(postIds);

  // Fetch and render posts
  const initialPosts: RenderedPost[] = await getRenderedPosts(
    processedIds,
    allowNotFound
  );

  // For catch-all routes (allowNotFound=false), 404 when no real posts were
  // resolved. We must call notFound() directly here — wrapping the async server
  // component in a parent try/catch does not work because the JSX is returned
  // synchronously and the throw happens later during React rendering.
  if (!allowNotFound) {
    const validPosts = initialPosts.filter(
      (post) => !post.title.includes("Not Found")
    );
    if (validPosts.length === 0) {
      notFound();
    }
  }

  // Fetch all navigation data from server in parallel using Cache Components
  // wrappers. Each call hits the in-memory Next cache after the first request.
  const [
    allAvailablePostIds,
    concretePostIds,
    categories,
    tags,
    postTypeCounts,
    allTimeline,
    chronicleData,
  ] = await Promise.all([
    getCachedAllAvailablePostIds(),
    getCachedAllConcretePostIds(),
    getCachedNestedCategoriesWithCounts(),
    getCachedTagsWithMetadata(),
    getCachedPostTypeCounts(),
    getCachedAllPostsByLastEdited(),
    getCachedChroniclePosts(),
  ]);

  // Derive initialActivePostId from params.searchParams if present,
  // or from the last post in the stack
  let initialActivePostId: string | null = null;
  const searchParams = params.searchParams as
    | Record<string, string | undefined>
    | undefined;
  if (searchParams && typeof searchParams.initialActivePostId === "string") {
    initialActivePostId = searchParams.initialActivePostId;
  } else if (processedIds.length > 0) {
    // For any route with posts, set the last post as active (consistent with UrlStateManager)
    initialActivePostId = processedIds.at(-1) ?? null;
  }

  return (
    <PostStackList
      allAvailablePostIds={allAvailablePostIds}
      allTimeline={allTimeline}
      categories={categories}
      chronicleData={chronicleData}
      concretePostIds={concretePostIds}
      initialActivePostId={initialActivePostId}
      isRootPage={isRootPage}
      postTypeCounts={postTypeCounts}
      serverInitialPosts={initialPosts}
      serverInitialStackIds={processedIds}
      tags={tags}
    />
  );
}
