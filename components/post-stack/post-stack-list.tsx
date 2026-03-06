import type React from "react";
import { Suspense, useMemo } from "react";
import PostStackContent from "@/components/post-stack/post-stack-content";
import PostStackInteractive from "@/components/post-stack/post-stack-interactive";
import { PostStackProvider } from "@/components/post-stack/post-stack-provider-xstate";
import type {
  CategoryNode,
  PostTypeCount,
  TagWithMetadata,
} from "@/types/navigation";
import type { RenderedPost } from "@/types/post";

type PostStackListProps = {
  serverInitialPosts: RenderedPost[];
  serverInitialStackIds: string[];
  allAvailablePostIds: string[];
  concretePostIds: string[];
  categories: CategoryNode[];
  tags: TagWithMetadata[];
  postTypeCounts: PostTypeCount[];
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
  chronicleData: Array<{
    id: string;
    slug: string;
    title: string;
    type: string;
    originalDate: Date;
    tags: Array<{ name: string }>;
    categories: Array<{ name: string }>;
  }>;
  isRootPage: boolean;
  initialActivePostId?: string | null;
};

/**
 * Server component that renders posts with server data and provides Suspense boundaries for client hydration
 */
const PostStackList: React.FC<PostStackListProps> = ({
  serverInitialPosts,
  serverInitialStackIds,
  allAvailablePostIds,
  concretePostIds,
  categories,
  tags,
  postTypeCounts,
  allTimeline,
  chronicleData,
  isRootPage,
  initialActivePostId,
}) => {
  // Keep the original server post IDs static - this should never change
  // It represents the posts that were server-rendered on initial page load
  const originalServerPostIds = useMemo(
    () => serverInitialPosts.map((post) => post.originalId),
    [serverInitialPosts]
  );

  return (
    <PostStackProvider
      allAvailablePostIds={allAvailablePostIds}
      allTimeline={allTimeline}
      categories={categories}
      chronicleData={chronicleData}
      concretePostIds={concretePostIds}
      initialActivePostId={initialActivePostId}
      isRootPage={isRootPage}
      postTypeCounts={postTypeCounts}
      serverInitialPosts={serverInitialPosts}
      serverInitialStackIds={serverInitialStackIds}
      tags={tags}
    >
      <div className="relative block min-h-screen w-full">
        {/* Render server posts immediately for optimal UX */}
        <PostStackContent posts={serverInitialPosts} />

        {/* Hydrate with client interactivity - pass ONLY the original server post IDs */}
        <Suspense fallback={null}>
          <PostStackInteractive serverPostOriginalIds={originalServerPostIds} />
        </Suspense>
      </div>
    </PostStackProvider>
  );
};

export default PostStackList;
