import PostStackList from "@/components/post-stack/post-stack-list";
import {
  getAllPostsByLastEditedAction,
  getChroniclePostsAction,
  getNestedCategoriesWithCounts,
  getPostTypeCounts,
  getTagsWithMetadata,
} from "@/lib/actions/navigation-actions";
import {
  type PostStackParams,
  parsePostStackParams,
  processPostIds,
} from "@/lib/post-stack-utils-client";
import {
  getConcretePostIds,
  getRenderedPosts,
} from "@/lib/post-stack-utils-server";
import { getAllAvailablePostIds } from "@/lib/posts";
import type { RenderedPost } from "@/types/post";

type PostStackDataFetcherProps = {
  params: PostStackParams;
  isRootPage: boolean;
  initialActivePostId?: string | null;
  allowNotFound?: boolean;
};

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

  // Handle case where no valid posts were found
  if (!allowNotFound && initialPosts.length === 0) {
    throw new Error("No valid posts found");
  }

  // For catch-all routes, validate that we have at least one real post (not "not found")
  if (!allowNotFound) {
    const validPosts = initialPosts.filter(
      (post) => !post.title.includes("Not Found")
    );
    if (validPosts.length === 0) {
      throw new Error("No valid posts found");
    }
  }

  // Get all available post IDs for navigation
  const allAvailablePostIds = await getAllAvailablePostIds();

  // Get concrete post IDs from database (using Prisma PostType.CONCRETE)
  const concretePostIds = await getConcretePostIds();

  // Fetch all navigation data from server
  // Optimized: Only fetch metadata for categories/tags, not full post details
  // Full post lists are loaded on-demand when drilling into categories/tags
  const [categories, tags, postTypeCounts, allTimeline, chronicleData] =
    await Promise.all([
      getNestedCategoriesWithCounts(),
      getTagsWithMetadata(),
      getPostTypeCounts(),
      getAllPostsByLastEditedAction(),
      getChroniclePostsAction(),
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
